// Enums are stored as varchar plus a CHECK, so adding a value later is a
// single ALTER TABLE in a migration instead of an ALTER TYPE.
export function enumCheck(
  column: string,
  values: Record<string, string>,
): string {
  const allowedValues = Object.values(values)
    .map((value) => `'${value}'`)
    .join(', ');
  return `"${column}" IN (${allowedValues})`;
}
