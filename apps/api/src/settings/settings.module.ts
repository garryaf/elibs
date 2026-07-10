import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { NotificationModule } from '../laboratory/notification/notification.module';
import { SETTINGS_QUERY_SERVICE } from './interfaces/settings-query.interface';

@Module({
  imports: [NotificationModule],
  controllers: [SettingsController],
  providers: [
    SettingsService,
    {
      provide: SETTINGS_QUERY_SERVICE,
      useExisting: SettingsService,
    },
  ],
  exports: [SettingsService, SETTINGS_QUERY_SERVICE],
})
export class SettingsModule {}
