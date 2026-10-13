import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuoteItem } from './entities/quote-item.entity';
import { Quote } from './entities/quote.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quote, QuoteItem])],
  exports: [TypeOrmModule],
})
export class QuotesModule {}
