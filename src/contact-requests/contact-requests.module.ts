import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactRequest } from './entities/contact-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContactRequest])],
  exports: [TypeOrmModule],
})
export class ContactRequestsModule {}
