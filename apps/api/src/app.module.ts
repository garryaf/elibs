import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { redisStore } from 'cache-manager-redis-yet';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './common/prisma/prisma.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { RbacModule } from './common/rbac/rbac.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LaboratoryModule } from './laboratory/laboratory.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
          },
          ttl: 30000, // Default TTL: 30 seconds
        }),
      }),
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 1 minute window
      limit: 10,   // max 10 requests per minute (applied per-route via decorator)
    }]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    PrismaModule,
    CryptoModule,
    RbacModule,
    UsersModule,
    AuthModule,
    LaboratoryModule,
    HealthModule,
  ],
})
export class AppModule {}
