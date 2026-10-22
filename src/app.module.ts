import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CatalogItemsModule } from './catalog-items/catalog-items.module';
import { CustomersModule } from './customers/customers.module';
import { createTypeOrmOptions } from './database/typeorm.config';
import { EmployeesModule } from './employees/employees.module';
import { InventoryItemsModule } from './inventory-items/inventory-items.module';
import { OrdersModule } from './orders/orders.module';
import { SalesModule } from './sales/sales.module';
import { ShowcaseItemsModule } from './showcase-items/showcase-items.module';
import { SiteSettingsModule } from './site-settings/site-settings.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { CommissionRulesModule } from './commission-rules/commission-rules.module';
import { CommissionsModule } from './commissions/commissions.module';
import { StatisticsModule } from './statistics/statistics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // ConfigModule copies the .env values into process.env, so the factory
    // reads the same variables as the TypeORM CLI.
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...createTypeOrmOptions(process.env),
        autoLoadEntities: true,
        migrationsRun: true,
      }),
    }),
    EmployeesModule,
    CustomersModule,
    CatalogItemsModule,
    OrdersModule,
    InventoryItemsModule,
    StockMovementsModule,
    ShowcaseItemsModule,
    SiteSettingsModule,
    SalesModule,
    CommissionRulesModule,
    CommissionsModule,
    StatisticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
