import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  EmsifaProvince,
  EmsifaRegency,
  EmsifaDistrict,
  EmsifaVillage,
  SyncResult,
} from './interfaces/emsifa-response.interface';

export type SyncStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface SyncProgress {
  status: SyncStatus;
  currentLevel: string;
  progress: {
    provinsi: { done: number; total: number };
    kabupatenKota: { done: number; total: number };
    kecamatan: { done: number; total: number };
    kelurahanDesa: { done: number; total: number };
  };
  result?: SyncResult;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

@Injectable()
export class RegionSyncService {
  /**
   * Use the final destination URL directly to avoid the 301 redirect
   * from emsifa.github.io → www.emsifa.com which can cause timeouts.
   */
  private readonly baseUrl =
    'https://www.emsifa.com/api-wilayah-indonesia/api';
  private readonly logger = new Logger(RegionSyncService.name);

  /** Concurrency limit — keep below Prisma's default connection pool (10) */
  private readonly CONCURRENCY = 5;
  /** Batch size for raw SQL upserts */
  private readonly BATCH_SIZE = 200;

  private syncProgress: SyncProgress = {
    status: 'idle',
    currentLevel: '',
    progress: {
      provinsi: { done: 0, total: 0 },
      kabupatenKota: { done: 0, total: 0 },
      kecamatan: { done: 0, total: 0 },
      kelurahanDesa: { done: 0, total: 0 },
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Synchronous sync — used by CLI command.
   * Runs the full sync and returns the result when complete.
   */
  async syncAll(): Promise<SyncResult> {
    if (this.syncProgress.status === 'running') {
      throw new Error('Sync already in progress');
    }

    this.resetProgress();
    await this.runSync();

    if (this.syncProgress.status === 'failed') {
      throw new Error(this.syncProgress.error || 'Sync failed');
    }

    return this.syncProgress.result!;
  }

  /**
   * Returns current sync status (for polling from the frontend).
   */
  getSyncStatus(): SyncProgress {
    return { ...this.syncProgress };
  }

  /**
   * Starts sync in background. Returns immediately so the HTTP response
   * is not blocked by the long-running operation.
   */
  startSyncInBackground(): { message: string } {
    if (this.syncProgress.status === 'running') {
      return { message: 'Sync already in progress' };
    }

    this.resetProgress();

    // Fire-and-forget — errors are captured in syncProgress
    this.runSync().catch((err) => {
      this.logger.error(`Sync failed unexpectedly: ${err}`);
      this.syncProgress.status = 'failed';
      this.syncProgress.error =
        err instanceof Error ? err.message : 'Unknown error';
      this.syncProgress.completedAt = new Date();
    });

    return { message: 'Sync started in background' };
  }

  private resetProgress(): void {
    this.syncProgress = {
      status: 'running',
      currentLevel: 'provinsi',
      progress: {
        provinsi: { done: 0, total: 0 },
        kabupatenKota: { done: 0, total: 0 },
        kecamatan: { done: 0, total: 0 },
        kelurahanDesa: { done: 0, total: 0 },
      },
      startedAt: new Date(),
    };
  }

  /**
   * Full sync logic — runs as background task.
   */
  private async runSync(): Promise<void> {
    const result: SyncResult = {
      provinsi: 0,
      kabupatenKota: 0,
      kecamatan: 0,
      kelurahanDesa: 0,
      errors: [],
    };

    try {
      // Level 1: Provinces
      this.logger.log('Starting region sync...');
      this.syncProgress.currentLevel = 'provinsi';
      const provinces = await this.fetchWithRetry<EmsifaProvince[]>(
        '/provinces.json',
      );
      this.syncProgress.progress.provinsi.total = provinces.length;
      await this.upsertProvincesBatch(provinces);
      this.syncProgress.progress.provinsi.done = provinces.length;
      result.provinsi = provinces.length;
      this.logger.log(`Synced ${provinces.length} provinsi`);

      // Level 2: Regencies (per province) — with concurrency
      this.syncProgress.currentLevel = 'kabupaten_kota';
      this.syncProgress.progress.kabupatenKota.total = provinces.length;
      await this.fetchAndUpsertInParallel(
        provinces.map((p) => ({
          path: `/regencies/${p.id}.json`,
          parentId: p.id,
        })),
        async (regencies: EmsifaRegency[]) => {
          await this.upsertRegenciesBatch(regencies);
          result.kabupatenKota += regencies.length;
        },
        (parentId, message) => {
          result.errors.push({
            level: 'kabupaten_kota',
            parentId,
            error: message,
          });
        },
        'kabupatenKota',
      );
      this.logger.log(`Synced ${result.kabupatenKota} kabupaten/kota`);

      // Level 3: Districts (per regency) — with concurrency
      this.syncProgress.currentLevel = 'kecamatan';
      const allRegencies = await this.prisma.kabupatenKota.findMany({
        select: { id: true },
      });
      this.syncProgress.progress.kecamatan.total = allRegencies.length;
      await this.fetchAndUpsertInParallel(
        allRegencies.map((r) => ({
          path: `/districts/${r.id}.json`,
          parentId: r.id,
        })),
        async (districts: EmsifaDistrict[]) => {
          await this.upsertDistrictsBatch(districts);
          result.kecamatan += districts.length;
        },
        (parentId, message) => {
          result.errors.push({
            level: 'kecamatan',
            parentId,
            error: message,
          });
        },
        'kecamatan',
      );
      this.logger.log(`Synced ${result.kecamatan} kecamatan`);

      // Level 4: Villages (per district) — with concurrency
      this.syncProgress.currentLevel = 'kelurahan_desa';
      const allDistricts = await this.prisma.kecamatan.findMany({
        select: { id: true },
      });
      this.syncProgress.progress.kelurahanDesa.total = allDistricts.length;
      await this.fetchAndUpsertInParallel(
        allDistricts.map((d) => ({
          path: `/villages/${d.id}.json`,
          parentId: d.id,
        })),
        async (villages: EmsifaVillage[]) => {
          await this.upsertVillagesBatch(villages);
          result.kelurahanDesa += villages.length;
        },
        (parentId, message) => {
          result.errors.push({
            level: 'kelurahan_desa',
            parentId,
            error: message,
          });
        },
        'kelurahanDesa',
      );
      this.logger.log(`Synced ${result.kelurahanDesa} kelurahan/desa`);

      this.logger.log(
        `Region sync completed. Errors: ${result.errors.length}`,
      );

      this.syncProgress.status = 'completed';
      this.syncProgress.result = result;
      this.syncProgress.completedAt = new Date();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Region sync failed: ${message}`);
      this.syncProgress.status = 'failed';
      this.syncProgress.error = message;
      this.syncProgress.result = result;
      this.syncProgress.completedAt = new Date();
    }
  }

  /**
   * Fetches data in parallel with controlled concurrency, then upserts.
   * Uses a semaphore pattern to keep concurrent DB writes within pool limits.
   */
  private async fetchAndUpsertInParallel<T>(
    items: { path: string; parentId: string }[],
    onSuccess: (data: T, parentId: string) => Promise<void>,
    onError: (parentId: string, message: string) => void,
    progressKey: keyof SyncProgress['progress'],
  ): Promise<void> {
    let processed = 0;

    for (let i = 0; i < items.length; i += this.CONCURRENCY) {
      const batch = items.slice(i, i + this.CONCURRENCY);

      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const data = await this.fetchWithRetry<T>(item.path);
          await onSuccess(data, item.parentId);
          return item.parentId;
        }),
      );

      for (const r of results) {
        if (r.status === 'rejected') {
          const failedItem = batch[results.indexOf(r)];
          const message =
            r.reason instanceof Error ? r.reason.message : 'Unknown error';
          this.logger.warn(
            `Failed to sync ${progressKey} for ${failedItem.parentId}: ${message}`,
          );
          onError(failedItem.parentId, message);
        }
        processed++;
      }

      this.syncProgress.progress[progressKey].done = Math.min(
        processed,
        items.length,
      );

      // Small delay between batches to avoid rate limiting
      if (i + this.CONCURRENCY < items.length) {
        await this.sleep(200);
      }
    }
  }

  private async fetchWithRetry<T>(
    path: string,
    retries = 3,
    delay = 1000,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

        const response = await fetch(url, {
          signal: controller.signal,
          redirect: 'follow',
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status} ${response.statusText} for ${url}`,
          );
        }

        return (await response.json()) as T;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        if (attempt < retries) {
          this.logger.warn(
            `Fetch attempt ${attempt} failed for ${path}: ${lastError.message}, retrying in ${delay}ms...`,
          );
          await this.sleep(delay);
          delay *= 2; // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  // ─── Raw SQL Batch Upsert Methods ──────────────────────────────────────────

  /**
   * Uses raw SQL INSERT ... ON CONFLICT for bulk upserts.
   * This is vastly more efficient than individual Prisma upserts in a transaction
   * and avoids connection pool exhaustion.
   */
  private async upsertProvincesBatch(
    provinces: EmsifaProvince[],
  ): Promise<void> {
    if (provinces.length === 0) return;

    for (let i = 0; i < provinces.length; i += this.BATCH_SIZE) {
      const batch = provinces.slice(i, i + this.BATCH_SIZE);
      const values = batch
        .map(
          (p) =>
            `('${this.escSql(p.id)}', '${this.escSql(p.name)}', true, NOW(), NOW())`,
        )
        .join(',\n');

      await this.prisma.$executeRawUnsafe(`
        INSERT INTO provinsi (id, name, "isActive", "createdAt", "updatedAt")
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          "updatedAt" = NOW()
      `);
    }
  }

  private async upsertRegenciesBatch(
    regencies: EmsifaRegency[],
  ): Promise<void> {
    if (regencies.length === 0) return;

    for (let i = 0; i < regencies.length; i += this.BATCH_SIZE) {
      const batch = regencies.slice(i, i + this.BATCH_SIZE);
      const values = batch
        .map(
          (r) =>
            `('${this.escSql(r.id)}', '${this.escSql(r.province_id)}', '${this.escSql(r.name)}', true, NOW(), NOW())`,
        )
        .join(',\n');

      await this.prisma.$executeRawUnsafe(`
        INSERT INTO kabupaten_kota (id, "provinsiId", name, "isActive", "createdAt", "updatedAt")
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          "updatedAt" = NOW()
      `);
    }
  }

  private async upsertDistrictsBatch(
    districts: EmsifaDistrict[],
  ): Promise<void> {
    if (districts.length === 0) return;

    for (let i = 0; i < districts.length; i += this.BATCH_SIZE) {
      const batch = districts.slice(i, i + this.BATCH_SIZE);
      const values = batch
        .map(
          (d) =>
            `('${this.escSql(d.id)}', '${this.escSql(d.regency_id)}', '${this.escSql(d.name)}', true, NOW(), NOW())`,
        )
        .join(',\n');

      await this.prisma.$executeRawUnsafe(`
        INSERT INTO kecamatan (id, "kabupatenKotaId", name, "isActive", "createdAt", "updatedAt")
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          "updatedAt" = NOW()
      `);
    }
  }

  private async upsertVillagesBatch(villages: EmsifaVillage[]): Promise<void> {
    if (villages.length === 0) return;

    for (let i = 0; i < villages.length; i += this.BATCH_SIZE) {
      const batch = villages.slice(i, i + this.BATCH_SIZE);
      const values = batch
        .map(
          (v) =>
            `('${this.escSql(v.id)}', '${this.escSql(v.district_id)}', '${this.escSql(v.name)}', true, NOW(), NOW())`,
        )
        .join(',\n');

      await this.prisma.$executeRawUnsafe(`
        INSERT INTO kelurahan_desa (id, "kecamatanId", name, "isActive", "createdAt", "updatedAt")
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          "updatedAt" = NOW()
      `);
    }
  }

  /**
   * Escape single quotes in SQL string values to prevent SQL injection.
   */
  private escSql(value: string): string {
    return value.replace(/'/g, "''");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
