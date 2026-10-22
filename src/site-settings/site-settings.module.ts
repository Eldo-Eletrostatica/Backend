import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { SiteSetting } from './entities/site-setting.entity';
import { SiteSettingsController } from './site-settings.controller';
import {
  DEFAULT_IMAGE_CLEANUP_GRACE_PERIOD_MS,
  IMAGE_CLEANUP_GRACE_PERIOD_MS,
  SiteSettingsService,
} from './site-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([SiteSetting]), StorageModule],
  exports: [TypeOrmModule],
  controllers: [SiteSettingsController],
  providers: [
    SiteSettingsService,
    {
      provide: IMAGE_CLEANUP_GRACE_PERIOD_MS,
      useValue: DEFAULT_IMAGE_CLEANUP_GRACE_PERIOD_MS,
    },
  ],
})
export class SiteSettingsModule {}
