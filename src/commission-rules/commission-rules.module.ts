import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionRule } from './entities/commission-rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommissionRule])],
  exports: [TypeOrmModule],
})
export class CommissionRulesModule {}
