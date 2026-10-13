import { DataSource } from 'typeorm';
import { createTypeOrmOptions } from './typeorm.config';

// Entry point of the TypeORM CLI (npm run migration:*).
export default new DataSource(createTypeOrmOptions(process.env));
