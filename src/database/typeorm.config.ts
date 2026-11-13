import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

type DatabaseEnv = Record<string, string | undefined>;

// Shared by the Nest app and the TypeORM CLI, so both see the same schema.
// The globs resolve to .ts under ts-node/jest and to .js after `nest build`.
export function createTypeOrmOptions(env: DatabaseEnv): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5432),
    username: env.DB_USERNAME ?? 'postgres',
    password: env.DB_PASSWORD ?? 'postgres',
    database: env.DB_NAME ?? 'postgres',
    // Hosted databases outside Render's private network (Neon, in the staging
    // environment) only accept encrypted connections; their certificates are
    // public, so Node's bundled CAs verify them.
    ssl: env.DB_SSL === 'true' ? true : undefined,
    namingStrategy: new SnakeNamingStrategy(),
    // With 'pgcrypto' TypeORM generates UUIDs through gen_random_uuid(), which
    // PostgreSQL 13+ ships built in; the default ('uuid-ossp') needs an extension.
    uuidExtension: 'pgcrypto',
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    synchronize: false,
  };
}
