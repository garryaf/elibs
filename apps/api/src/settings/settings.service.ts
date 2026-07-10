import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ISettingsQueryService } from './interfaces/settings-query.interface';

@Injectable()
export class SettingsService implements ISettingsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get a single setting by key.
   */
  async getSetting(key: string): Promise<string | null> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting?.value ?? null;
  }

  /**
   * Set (upsert) a single setting by key.
   */
  async setSetting(key: string, value: string): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  /**
   * Get all settings matching a key prefix.
   */
  async getSettingsByPrefix(prefix: string): Promise<Record<string, string>> {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: { startsWith: prefix },
      },
    });

    const result: Record<string, string> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }
    return result;
  }

  /**
   * Bulk upsert multiple settings at once.
   */
  async bulkUpdate(entries: { key: string; value: string }[]): Promise<void> {
    await this.prisma.$transaction(
      entries.map((entry) =>
        this.prisma.systemSetting.upsert({
          where: { key: entry.key },
          update: { value: entry.value },
          create: { key: entry.key, value: entry.value },
        }),
      ),
    );
  }
}
