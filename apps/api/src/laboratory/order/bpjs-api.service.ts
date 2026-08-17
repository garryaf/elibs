import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface BpjsVerificationResult {
  success: boolean;
  message: string;
  data?: {
    noSEP: string;
    noKartu: string;
    tglSEP: string;
    peserta?: {
      nama: string;
      noKartu: string;
      hakKelas: { kode: string; nama: string };
      jnsPeserta: { kode: string; nama: string };
    };
    diagnosa?: { kode: string; nama: string };
    ppiPenerima?: { kode: string; nama: string };
  };
  errorCode?: string;
}

export interface BpjsApiConfig {
  baseUrl: string;
  consId: string;
  secretKey: string;
  userKey: string;
}

@Injectable()
export class BpjsApiService {
  private readonly logger = new Logger(BpjsApiService.name);
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get BPJS API configuration from environment variables.
   * Returns null if credentials are not configured.
   */
  private getConfig(): BpjsApiConfig | null {
    const baseUrl = this.configService.get<string>('BPJS_VCLAIM_BASE_URL');
    const consId = this.configService.get<string>('BPJS_CONS_ID');
    const secretKey = this.configService.get<string>('BPJS_SECRET_KEY');
    const userKey = this.configService.get<string>('BPJS_USER_KEY');

    if (!baseUrl || !consId || !secretKey) {
      return null;
    }

    return { baseUrl, consId, secretKey, userKey: userKey ?? '' };
  }

  /**
   * Generate BPJS API signature header.
   * BPJS VClaim uses HMAC-SHA256 with consId + timestamp as message signed with secretKey.
   */
  private generateSignature(config: BpjsApiConfig): {
    timestamp: string;
    signature: string;
  } {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = `${config.consId}&${timestamp}`;
    const signature = crypto
      .createHmac('sha256', config.secretKey)
      .update(message)
      .digest('base64');

    return { timestamp, signature };
  }

  /**
   * Build headers for BPJS VClaim API request.
   */
  private buildHeaders(config: BpjsApiConfig): Record<string, string> {
    const { timestamp, signature } = this.generateSignature(config);

    return {
      'Content-Type': 'application/json',
      'X-cons-id': config.consId,
      'X-timestamp': timestamp,
      'X-signature': signature,
      user_key: config.userKey,
    };
  }

  /**
   * Verify BPJS eligibility by SEP number using VClaim API.
   * Implements retry logic (3 attempts with exponential backoff: 1s, 2s, 4s).
   */
  async verifyEligibility(
    sepNumber: string,
    bpjsNumber?: string,
  ): Promise<BpjsVerificationResult> {
    const config = this.getConfig();

    if (!config) {
      return {
        success: false,
        message:
          'Konfigurasi BPJS API belum diatur. Silakan konfigurasi BPJS_VCLAIM_BASE_URL, BPJS_CONS_ID, dan BPJS_SECRET_KEY pada environment.',
        errorCode: 'BPJS_NOT_CONFIGURED',
      };
    }

    // Build the verification endpoint URL
    // VClaim uses /SEP/{noSEP} for SEP lookup or /Peserta/{noKartu} for eligibility
    const endpoint = sepNumber
      ? `${config.baseUrl}/SEP/${sepNumber}`
      : `${config.baseUrl}/Peserta/nokartu/${bpjsNumber}/tglSEP/${this.formatDate(new Date())}/jnsPelayanan/2`;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        this.logger.log(
          `BPJS verification attempt ${attempt}/${this.MAX_RETRIES} for SEP: ${sepNumber || 'N/A'}, BPJS#: ${bpjsNumber || 'N/A'}`,
        );

        const headers = this.buildHeaders(config);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch(endpoint, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'No response body');
          throw new Error(
            `BPJS API returned HTTP ${response.status}: ${errorBody}`,
          );
        }

        const responseData = await response.json();

        // BPJS VClaim wraps response in metaData + response structure
        const meta = responseData?.metaData;
        if (meta && meta.code !== '200' && meta.code !== 200) {
          return {
            success: false,
            message: `Verifikasi BPJS gagal: ${meta.message || 'Unknown error'}`,
            errorCode: `BPJS_API_ERROR_${meta.code}`,
          };
        }

        this.logger.log(
          `BPJS verification successful on attempt ${attempt} for SEP: ${sepNumber}`,
        );

        return {
          success: true,
          message: 'Verifikasi BPJS berhasil',
          data: responseData?.response,
        };
      } catch (error) {
        lastError = error as Error;
        const isAbortError =
          error instanceof Error && error.name === 'AbortError';
        const errorType = isAbortError ? 'timeout' : 'network error';

        this.logger.warn(
          `BPJS verification attempt ${attempt}/${this.MAX_RETRIES} failed (${errorType}): ${(error as Error).message}`,
        );

        if (attempt < this.MAX_RETRIES) {
          const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          this.logger.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    const isTimeout =
      lastError instanceof Error && lastError.name === 'AbortError';
    const errorMessage = isTimeout
      ? `Verifikasi BPJS gagal: koneksi ke server BPJS timeout setelah ${this.MAX_RETRIES} percobaan. Silakan coba lagi nanti.`
      : `Verifikasi BPJS gagal: tidak dapat terhubung ke server BPJS setelah ${this.MAX_RETRIES} percobaan. Error: ${lastError?.message || 'Unknown'}`;

    return {
      success: false,
      message: errorMessage,
      errorCode: isTimeout ? 'BPJS_TIMEOUT' : 'BPJS_CONNECTION_FAILED',
    };
  }

  /**
   * Format date to BPJS API date format (YYYY-MM-DD).
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Sleep utility for exponential backoff.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
