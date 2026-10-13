import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContactRequestsModule } from './contact-requests/contact-requests.module';
import { CustomersModule } from './customers/customers.module';
import { createTypeOrmOptions } from './database/typeorm.config';
import { EmployeesModule } from './employees/employees.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
