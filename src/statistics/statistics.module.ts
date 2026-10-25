import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { StatisticsPdfRenderer } from './reports/statistics-pdf.renderer';
import { StatisticsSpreadsheetBuilder } from './reports/statistics-spreadsheet.builder';
import { StatisticsController } from './statistics.controller';
import { StatisticsExportService } from './statistics-export.service';
import { StatisticsService } from './statistics.service';

@Module({
  imports: [OrdersModule],
  controllers: [StatisticsController],
  providers: [
    StatisticsService,
    StatisticsExportService,
    StatisticsPdfRenderer,
    StatisticsSpreadsheetBuilder,
  ],
})
export class StatisticsModule {}
