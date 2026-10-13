import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyEvent } from './entities/company-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyEvent])],
  exports: [TypeOrmModule],
})
export class CompanyEventsModule {}
