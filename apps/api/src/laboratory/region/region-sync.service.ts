import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  EmsifaProvince,
  EmsifaRegency,
  EmsifaDistrict,
  EmsifaVillage,
  SyncResult,
} from './interfaces/emsifa-response.interface';

@Injectable()
export class RegionSyncService {
  private readonly baseUrl =
    'https://emsifa.github.io/api-wilayah-indonesia/api';
  private readonly logger = new Logger(RegionSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncAll(): Promise<SyncResult> {
    const result: SyncResult = {
      provinsi: 0,
      kabupatenKota: 0,
      kecamatan: 0,
      kelurahanDesa: 0,
      errors: [],
    };

    // Level 1: Provinces
    this.logger.log('Starting region sync...');
    const provinces = await this.fetchWithRetry<EmsifaProvince[]>(
      '/provinces.json',
    );
    await this.upsertProvinces(provinces);
    result.provinsi = provinces.length;
    this.logger.log(`Synced ${provinces.length} provinsi`);

    // Level 2: Regencies (per province)
    for (const prov of provinces) {
      try {
        const regencies = await this.fetchWithRetry<EmsifaRegency[]>(
          `/regencies/${prov.id}.json`,
        );
        await this.upsertRegencies(regencies);
        result.kabupatenKota += regencies.length;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(
          `Failed to sync kabupaten/kota for provinsi ${prov.id}: ${message}`,
        );
        result.errors.push({
          level: 'kabupaten_kota',
          parentId: prov.id,
          error: message,
        });
      }
    }
    this.logger.log(`Synced ${result.kabupatenKota} kabupaten/kota`);

    // Level 3: Districts (per regency)
    const allRegencies = await this.prisma.kabupatenKota.findMany({
      select: { id: true },
    });
    for (const reg of allRegencies) {
      try {
        const districts = await this.fetchWithRetry<EmsifaDistrict[]>(
          `/districts/${reg.id}.json`,
        );
        await this.upsertDistricts(districts);
        result.kecamatan += districts.length;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(
          `Failed to sync kecamatan for kabupaten/kota ${reg.id}: ${message}`,
        );
        result.errors.push({
          level: 'kecamatan',
          parentId: reg.id,
          error: message,
        });
      }
    }
    this.logger.log(`Synced ${result.kecamatan} kecamatan`);

    // Level 4: Villages (per district)
    const allDistricts = await this.prisma.kecamatan.findMany({
      select: { id: true },
    });
    for (const dist of allDistricts) {
      try {
        const villages = await this.fetchWithRetry<EmsifaVillage[]>(
          `/villages/${dist.id}.json`,
        );
        await this.upsertVillages(villages);
        result.kelurahanDesa += villages.length;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(
          `Failed to sync kelurahan/desa for kecamatan ${dist.id}: ${message}`,
        );
        result.errors.push({
          level: 'kelurahan_desa',
          parentId: dist.id,
          error: message,
        });
      }
    }
    this.logger.log(`Synced ${result.kelurahanDesa} kelurahan/desa`);

    this.logger.log(
      `Region sync completed. Errors: ${result.errors.length}`,
    );
    return result;
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
        const response = await fetch(url);

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
            `Fetch attempt ${attempt} failed for ${path}, retrying in ${delay}ms...`,
          );
          await this.sleep(delay);
          delay *= 2; // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  private async upsertProvinces(provinces: EmsifaProvince[]): Promise<void> {
    for (const prov of provinces) {
      await this.prisma.provinsi.upsert({
        where: { id: prov.id },
        update: { name: prov.name },
        create: { id: prov.id, name: prov.name },
      });
    }
  }

  private async upsertRegencies(regencies: EmsifaRegency[]): Promise<void> {
    for (const reg of regencies) {
      await this.prisma.kabupatenKota.upsert({
        where: { id: reg.id },
        update: { name: reg.name },
        create: {
          id: reg.id,
          provinsiId: reg.province_id,
          name: reg.name,
        },
      });
    }
  }

  private async upsertDistricts(districts: EmsifaDistrict[]): Promise<void> {
    for (const dist of districts) {
      await this.prisma.kecamatan.upsert({
        where: { id: dist.id },
        update: { name: dist.name },
        create: {
          id: dist.id,
          kabupatenKotaId: dist.regency_id,
          name: dist.name,
        },
      });
    }
  }

  private async upsertVillages(villages: EmsifaVillage[]): Promise<void> {
    for (const village of villages) {
      await this.prisma.kelurahanDesa.upsert({
        where: { id: village.id },
        update: { name: village.name },
        create: {
          id: village.id,
          kecamatanId: village.district_id,
          name: village.name,
        },
      });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
