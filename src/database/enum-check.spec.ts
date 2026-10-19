import { enumCheck } from './enum-check';

describe('enumCheck', () => {
  it.each([
    [
      'role',
      { Admin: 'admin', Manager: 'manager', Employee: 'employee' },
      `"role" IN ('admin', 'manager', 'employee')`,
    ],
    ['status', { Queued: 'queued' }, `"status" IN ('queued')`],
  ])(
    'restringe a coluna %s aos valores do enum',
    (column, values, expected) => {
      expect(enumCheck(column, values)).toBe(expected);
    },
  );
});
