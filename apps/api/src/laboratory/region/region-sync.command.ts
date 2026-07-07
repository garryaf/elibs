import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { RegionSyncService } from './region-sync.service';

/**
 * CLI command to sync region data from EMSIFA API.
 *
 * Usage:
 *   npx ts-node src/laboratory/region/region-sync.command.ts
 *
 * Or via npm script (if registered):
 *   npm run region:sync
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('RegionSyncCommand');

  logger.log('Initializing NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const syncService = app.get(RegionSyncService);

    logger.log('Starting region data synchronization from EMSIFA API...');
    const startTime = Date.now();

    const result = await syncService.syncAll();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    logger.log('=== Region Sync Summary ===');
    logger.log(`Provinsi:       ${result.provinsi}`);
    logger.log(`Kabupaten/Kota: ${result.kabupatenKota}`);
    logger.log(`Kecamatan:      ${result.kecamatan}`);
    logger.log(`Kelurahan/Desa: ${result.kelurahanDesa}`);
    logger.log(`Errors:         ${result.errors.length}`);
    logger.log(`Duration:       ${elapsed}s`);

    if (result.errors.length > 0) {
      logger.warn('Errors encountered during sync:');
      for (const err of result.errors) {
        logger.warn(`  [${err.level}] parentId=${err.parentId}: ${err.error}`);
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Region sync failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
