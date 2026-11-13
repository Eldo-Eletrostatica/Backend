import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { createTypeOrmOptions } from './typeorm.config';

function sslOf(env: Record<string, string | undefined>) {
  return (createTypeOrmOptions(env) as PostgresConnectionOptions).ssl;
}

describe('createTypeOrmOptions', () => {
  it.each<[string | undefined, boolean | undefined]>([
    ['true', true],
    [undefined, undefined],
    ['false', undefined],
    ['', undefined],
  ])('com DB_SSL=%p, ssl é %p', (dbSsl, expectedSsl) => {
    expect(sslOf({ DB_SSL: dbSsl })).toBe(expectedSsl);
  });
});
