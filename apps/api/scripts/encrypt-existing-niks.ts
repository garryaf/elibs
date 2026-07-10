/**
 * Data Migration Script: Encrypt Existing Patient NIK Values
 *
 * This script reads all patients with plaintext (unencrypted) NIK values,
 * encrypts each NIK using CryptoService, and writes back the encrypted values.
 *
 * Usage:
 *   npx ts-node scripts/encrypt-existing-niks.ts            # Execute migration
 *   npx ts-node scripts/encrypt-existing-niks.ts --dry-run  # Preview only (no writes)
 *
 * Environment:
 *   ENCRYPTION_KEY or JWT_SECRET must be set for encryption to work.
 */

import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// --- Configuration ---
const BATCH_SIZE = 100;
const isDryRun = process.argv.includes('--dry-run');

// --- Inline encryption utilities (avoids NestJS DI for standalone script) ---
const algorithm = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const encryptionKey = process.env['ENCRYPTION_KEY'];
  const secret = encryptionKey || process.env['JWT_SECRET'] || '';
  if (!secret) {
    console.error(
      'ERROR: Neither ENCRYPTION_KEY nor JWT_SECRET environment variable is set.',
    );
    process.exit(1);
  }
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function isEncrypted(value: string): boolean {
  return /^[a-f0-9]{32}:[a-f0-9]{32}:[a-f0-9]+$/.test(value);
}

// --- Main migration logic ---
async function main() {
  const key = getEncryptionKey();
  const prisma = new PrismaClient();

  console.log('=== NIK Encryption Migration ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be written)' : 'LIVE'}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('');

  try {
    await prisma.$connect();

    // Count total patients
    const totalPatients = await prisma.patient.count();
    console.log(`Total patients in database: ${totalPatients}`);

    // Process in batches using cursor-based pagination
    let processedCount = 0;
    let encryptedCount = 0;
    let alreadyEncryptedCount = 0;
    let errorCount = 0;
    let cursor: string | undefined;

    while (true) {
      const patients = await prisma.patient.findMany({
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: { id: true, nik: true },
        orderBy: { id: 'asc' },
      });

      if (patients.length === 0) break;

      for (const patient of patients) {
        processedCount++;

        if (isEncrypted(patient.nik)) {
          alreadyEncryptedCount++;
          continue;
        }

        // Plaintext NIK found - encrypt it
        const encryptedNik = encrypt(patient.nik, key);

        if (!isDryRun) {
          try {
            await prisma.patient.update({
              where: { id: patient.id },
              data: { nik: encryptedNik },
            });
            encryptedCount++;
          } catch (err) {
            errorCount++;
            console.error(
              `  ERROR encrypting patient ${patient.id}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        } else {
          encryptedCount++;
          // In dry-run, show what would be encrypted (mask the NIK for security)
          const masked = patient.nik.length >= 8
            ? `${patient.nik.slice(0, 4)}****${patient.nik.slice(-4)}`
            : '****';
          console.log(`  Would encrypt: patient ${patient.id} (NIK: ${masked})`);
        }
      }

      cursor = patients[patients.length - 1].id;

      // Log progress every batch
      const progress = Math.round((processedCount / totalPatients) * 100);
      console.log(
        `  Progress: ${processedCount}/${totalPatients} (${progress}%) - ` +
          `Encrypted: ${encryptedCount}, Already encrypted: ${alreadyEncryptedCount}, Errors: ${errorCount}`,
      );
    }

    console.log('');
    console.log('=== Migration Complete ===');
    console.log(`  Total processed: ${processedCount}`);
    console.log(`  Newly encrypted: ${encryptedCount}`);
    console.log(`  Already encrypted: ${alreadyEncryptedCount}`);
    console.log(`  Errors: ${errorCount}`);

    if (isDryRun) {
      console.log('');
      console.log('This was a DRY RUN. No changes were written to the database.');
      console.log('Run without --dry-run to execute the migration.');
    }
  } catch (err) {
    console.error('Fatal error during migration:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
