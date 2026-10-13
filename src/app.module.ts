import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommissionRulesModule } from './commission-rules/commission-rules.module';
import { CompanyEventsModule } from './company-events/company-events.module';
import { ContactRequestsModule } from './contact-requests/contact-requests.module';
import { CustomersModule } from './customers/customers.module';
import { createTypeOrmOptions } from './database/typeorm.config';
import { EmployeesModule } from './employees/employees.module';
import { InventoryCategoriesModule } from './inventory-categories/inventory-categories.module';
import { InventoryItemsModule } from './inventory-items/inventory-items.module';
import { PaintTypesModule } from './paint-types/paint-types.module';
import { PartMaterialsModule } from './part-materials/part-materials.module';
import { PortfolioCategoriesModule } from './portfolio-categories/portfolio-categories.module';
import { PortfolioProjectsModule } from './portfolio-projects/portfolio-projects.module';
import { QuotesModule } from './quotes/quotes.module';
import { ServiceOrdersModule } from './service-orders/service-orders.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...createTypeOrmOptions({
          DB_HOST: configService.get<string>('DB_HOST'),
          DB_PORT: configService.get<string>('DB_PORT'),
          DB_USERNAME: configService.get<string>('DB_USERNAME'),
          DB_PASSWORD: configService.get<string>('DB_PASSWORD'),
          DB_NAME: configService.get<string>('DB_NAME'),
        }),
        autoLoadEntities: true,
        migrationsRun: true,
      }),
    }),
    EmployeesModule,
    CustomersModule,
    ContactRequestsModule,
    PaintTypesModule,
    PartMaterialsModule,
    QuotesModule,
    CommissionRulesModule,
    ServiceOrdersModule,
    InventoryCategoriesModule,
    SuppliersModule,
    InventoryItemsModule,
    StockMovementsModule,
    PortfolioCategoriesModule,
    PortfolioProjectsModule,
    CompanyEventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
