import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    // Prefer dedicated ENCRYPTION_KEY env var, fallback to JWT_SECRET derivation
    const encryptionKey = configService.get<string>('ENCRYPTION_KEY');
    const secret = encryptionKey || configService.get<string>('JWT_SECRET') || '';
    this.key = crypto.createHash('sha256').update(secret).digest();
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Mask a NIK for display: show first 4 and last 4, mask middle.
   * e.g., "3275012345678901" → "3275********8901"
   */
  maskNik(nik: string): string {
    if (!nik || nik.length < 8) return nik;
    const first = nik.slice(0, 4);
    const last = nik.slice(-4);
    const middle = '*'.repeat(nik.length - 8);
    return `${first}${middle}${last}`;
  }

  /**
   * Check if a string is already encrypted (has the iv:tag:data format)
   */
  isEncrypted(value: string): boolean {
    return /^[a-f0-9]{32}:[a-f0-9]{32}:[a-f0-9]+$/.test(value);
  }
}
