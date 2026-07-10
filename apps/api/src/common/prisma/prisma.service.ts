import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CryptoService } from '../crypto/crypto.service';
import { createPiiEncryptionExtension } from './pii-encryption.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private _extendedClient: ReturnType<typeof this.withPiiExtension> | undefined;

  constructor(private readonly cryptoService: CryptoService) {
    super();
  }

  /**
   * Returns the Prisma client with PII encryption extension applied.
   * The extended client transparently encrypts/decrypts Patient.nik field.
   */
  get extended() {
    if (!this._extendedClient) {
      this._extendedClient = this.withPiiExtension();
    }
    return this._extendedClient;
  }

  private withPiiExtension() {
    return this.$extends(createPiiEncryptionExtension(this.cryptoService));
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
