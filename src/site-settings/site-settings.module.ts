import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { SiteSetting } from './entities/site-setting.entity';
import { SiteSettingsController } from './site-settings.controller';
import { SiteSettingsService } from './site-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([SiteSetting]), StorageModule],
  exports: [TypeOrmModule],
  controllers: [SiteSettingsController],
  providers: [SiteSettingsService],
})
export class SiteSettingsModule {}
