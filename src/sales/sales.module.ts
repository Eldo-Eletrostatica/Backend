import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

// The service works through the DataSource transaction, so it needs no
// repositories: the entities it touches are registered by their own modules.
@Module({
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
