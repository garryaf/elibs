import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { ISettingsQueryService } from './interfaces/settings-query.interface';

// ─── Key Whitelist & Sensitive Keys ──────────────────────────────────────────

/**
 * BACK-GEN-01: Whitelist of all recognized settings key prefixes.
 * Keys not matching any prefix will be rejected by the bulk endpoint.
 */
export const ALLOWED_KEY_PREFIXES = [
  'general_',
  'smtp_',
  'notification.',
  'appearance.',
  'whatsapp.',
  'audit_',
] as const;

/**
 * BACK-GEN-03: Settings keys whose values must be stored encrypted.
 * Values are encrypted with AES-256-GCM via CryptoService before persisting
 * and decrypted when read by consuming services.
 */
export const SENSITIVE_SETTING_KEYS = new Set([
  'smtp_pass',
  'whatsapp.api_key',
]);

@Injectable()
export class SettingsService implements ISettingsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Check if a key is in the allowed whitelist.
   */
  isKeyAllowed(key: string): boolean {
    return ALLOWED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
  }

  /**
   * Check if a key holds a sensitive value that should be encrypted.
   */
  isSensitiveKey(key: string): boolean {
    return SENSITIVE_SETTING_KEYS.has(key);
  }

  /**
   * Encrypt a value if the key is marked as sensitive.
   */
  private encryptIfSensitive(key: string, value: string): string {
    if (
      this.isSensitiveKey(key) &&
      value &&
      !this.cryptoService.isEncrypted(value)
    ) {
      return this.cryptoService.encrypt(value);
    }
    return value;
  }

  /**
   * Decrypt a value if the key is marked as sensitive and the value is encrypted.
   */
  private decryptIfSensitive(key: string, value: string): string {
    if (
      this.isSensitiveKey(key) &&
      value &&
      this.cryptoService.isEncrypted(value)
    ) {
      try {
        return this.cryptoService.decrypt(value);
      } catch {
        // If decryption fails (e.g., key changed), return as-is
        return value;
      }
    }
    return value;
  }

  /**
   * Get a single setting by key. Decrypts sensitive values.
   */
  async getSetting(key: string): Promise<string | null> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    if (!setting) return null;
    return this.decryptIfSensitive(key, setting.value);
  }

  /**
   * Get a single setting raw (without decryption) — for internal comparison.
   */
  async getSettingRaw(key: string): Promise<string | null> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting?.value ?? null;
  }

  /**
   * Set (upsert) a single setting by key. Encrypts sensitive values.
   */
  async setSetting(key: string, value: string): Promise<void> {
    const storedValue = this.encryptIfSensitive(key, value);
    await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: storedValue },
      create: { key, value: storedValue },
    });
  }

  /**
   * Get all settings matching a key prefix. Decrypts sensitive values.
   */
  async getSettingsByPrefix(prefix: string): Promise<Record<string, string>> {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: { startsWith: prefix },
      },
    });

    const result: Record<string, string> = {};
    for (const setting of settings) {
      result[setting.key] = this.decryptIfSensitive(setting.key, setting.value);
    }
    return result;
  }

  /**
   * Get old values for a set of keys (before an update) for audit trail.
   * Returns raw decrypted values for non-sensitive keys, masked for sensitive keys.
   */
  async getOldValuesForAudit(keys: string[]): Promise<Record<string, string>> {
    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    });

    const result: Record<string, string> = {};
    for (const setting of settings) {
      // Mask sensitive values in audit trail
      if (this.isSensitiveKey(setting.key)) {
        result[setting.key] = '••••••••';
      } else {
        result[setting.key] = setting.value;
      }
    }
    return result;
  }

  /**
   * Bulk upsert multiple settings at once. Encrypts sensitive values.
   */
  async bulkUpdate(entries: { key: string; value: string }[]): Promise<void> {
    await this.prisma.$transaction(
      entries.map((entry) => {
        const storedValue = this.encryptIfSensitive(entry.key, entry.value);
        return this.prisma.systemSetting.upsert({
          where: { key: entry.key },
          update: { value: storedValue },
          create: { key: entry.key, value: storedValue },
        });
      }),
    );
  }

  /**
   * Validate that all keys in a batch are allowed.
   * Returns list of invalid keys, empty if all valid.
   */
  validateKeys(keys: string[]): string[] {
    return keys.filter((key) => !this.isKeyAllowed(key));
  }
}
