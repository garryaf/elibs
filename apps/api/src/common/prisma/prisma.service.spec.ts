import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { CryptoService } from '../crypto/crypto.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        CryptoService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'ENCRYPTION_KEY') return undefined;
              if (key === 'JWT_SECRET') return 'test-secret-key-for-testing';
              return undefined;
            },
          },
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should expose extended client with PII encryption', () => {
    expect(service.extended).toBeDefined();
  });
});
