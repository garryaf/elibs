import { Injectable, Logger } from '@nestjs/common';
import { BpjsVerificationStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Default BPJS verification TTL in hours.
 * Used when 'bpjs_verification_ttl_hours' is not set in system_settings.
 */
const DEFAULT_BPJS_VERIFICATION_TTL_HOURS = 24;

export interface BpjsVerificationCheckResult {
  isValid: boolean;
  isExpired: boolean;
  verificationStatus: BpjsVerificationStatus | null;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  message?: string;
}

@Injectable()
export class BpjsVerificationExpirationService {
  private readonly logger = new Logger(BpjsVerificationExpirationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the configured TTL for BPJS verification in hours.
   * Reads from system_settings with key 'bpjs_verification_ttl_hours'.
   * Falls back to DEFAULT_BPJS_VERIFICATION_TTL_HOURS (24) if not configured.
   */
  async getVerificationTtlHours(): Promise<number> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'bpjs_verification_ttl_hours' },
      });

      if (setting?.value) {
        const parsed = parseInt(setting.value, 10);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to read bpjs_verification_ttl_hours from system_settings: ${(error as Error).message}`,
      );
    }

    return DEFAULT_BPJS_VERIFICATION_TTL_HOURS;
  }

  /**
   * Check if a BPJS verification for a given order is still valid (not expired).
   * A verification is valid if:
   *   - verificationStatus === VERIFIED
   *   - verifiedAt + TTL > current time
   *
   * If the verification has expired, the status is transitioned to EXPIRED.
   */
  async checkVerificationValidity(
    orderId: string,
  ): Promise<BpjsVerificationCheckResult> {
    const bpjsDetail = await this.prisma.bpjsOrderDetail.findUnique({
      where: { orderId },
    });

    if (!bpjsDetail) {
      return {
        isValid: false,
        isExpired: false,
        verificationStatus: null,
        verifiedAt: null,
        expiresAt: null,
        message: 'Detail BPJS tidak ditemukan untuk order ini',
      };
    }

    // If already expired or not verified, return current state
    if (bpjsDetail.verificationStatus === BpjsVerificationStatus.EXPIRED) {
      return {
        isValid: false,
        isExpired: true,
        verificationStatus: BpjsVerificationStatus.EXPIRED,
        verifiedAt: bpjsDetail.verifiedAt,
        expiresAt: bpjsDetail.verifiedAt
          ? await this.calculateExpiresAt(bpjsDetail.verifiedAt)
          : null,
        message:
          'Verifikasi BPJS telah kedaluwarsa. Silakan lakukan verifikasi ulang.',
      };
    }

    if (bpjsDetail.verificationStatus !== BpjsVerificationStatus.VERIFIED) {
      return {
        isValid: false,
        isExpired: false,
        verificationStatus: bpjsDetail.verificationStatus,
        verifiedAt: bpjsDetail.verifiedAt,
        expiresAt: null,
        message: `Status verifikasi BPJS saat ini: ${bpjsDetail.verificationStatus}. Verifikasi diperlukan sebelum pengambilan sampel.`,
      };
    }

    // Status is VERIFIED — check if it has expired based on TTL
    if (!bpjsDetail.verifiedAt) {
      // Verified but no verifiedAt timestamp (shouldn't happen, but handle gracefully)
      return {
        isValid: false,
        isExpired: false,
        verificationStatus: bpjsDetail.verificationStatus,
        verifiedAt: null,
        expiresAt: null,
        message:
          'Verifikasi BPJS tidak memiliki timestamp. Silakan lakukan verifikasi ulang.',
      };
    }

    const ttlHours = await this.getVerificationTtlHours();
    const expiresAt = new Date(
      bpjsDetail.verifiedAt.getTime() + ttlHours * 60 * 60 * 1000,
    );
    const now = new Date();

    if (now > expiresAt) {
      // Verification has expired — transition status to EXPIRED
      await this.transitionToExpired(orderId);

      this.logger.log(
        `BPJS verification expired for order ${orderId}. ` +
          `Verified at: ${bpjsDetail.verifiedAt.toISOString()}, ` +
          `Expired at: ${expiresAt.toISOString()}, TTL: ${ttlHours}h`,
      );

      return {
        isValid: false,
        isExpired: true,
        verificationStatus: BpjsVerificationStatus.EXPIRED,
        verifiedAt: bpjsDetail.verifiedAt,
        expiresAt,
        message: `Verifikasi BPJS telah kedaluwarsa (berlaku ${ttlHours} jam sejak verifikasi). Silakan lakukan verifikasi ulang sebelum pengambilan sampel.`,
      };
    }

    // Verification is still valid
    return {
      isValid: true,
      isExpired: false,
      verificationStatus: BpjsVerificationStatus.VERIFIED,
      verifiedAt: bpjsDetail.verifiedAt,
      expiresAt,
    };
  }

  /**
   * Transition a BPJS verification to EXPIRED status.
   */
  private async transitionToExpired(orderId: string): Promise<void> {
    await this.prisma.bpjsOrderDetail.update({
      where: { orderId },
      data: {
        verificationStatus: BpjsVerificationStatus.EXPIRED,
      },
    });
  }

  /**
   * Calculate the expiration timestamp for a given verifiedAt date.
   */
  private async calculateExpiresAt(verifiedAt: Date): Promise<Date> {
    const ttlHours = await this.getVerificationTtlHours();
    return new Date(verifiedAt.getTime() + ttlHours * 60 * 60 * 1000);
  }
}
