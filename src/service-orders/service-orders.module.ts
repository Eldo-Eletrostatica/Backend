import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceOrder } from './entities/service-order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceOrder])],
  exports: [TypeOrmModule],
})
export class ServiceOrdersModule {}
