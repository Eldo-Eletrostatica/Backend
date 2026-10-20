import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { CommissionCalculatorService } from './commission-calculator.service';
import { CommissionRulesController } from './commission-rules.controller';
import { CommissionRulesService } from './commission-rules.service';
import { CommissionRule } from './entities/commission-rule.entity';
import { AdminGuard } from './guards/admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([CommissionRule, Employee])],
  controllers: [CommissionRulesController],
  providers: [CommissionRulesService, CommissionCalculatorService, AdminGuard],
  exports: [CommissionRulesService, CommissionCalculatorService],
})
export class CommissionRulesModule {}
