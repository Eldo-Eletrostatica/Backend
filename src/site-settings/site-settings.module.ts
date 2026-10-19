import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteSetting } from './entities/site-setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SiteSetting])],
  exports: [TypeOrmModule],
})
export class SiteSettingsModule {}
