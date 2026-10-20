// Brazil has had no daylight saving time since 2019, so Brasília is always
// UTC-3.
const BRASILIA_UTC_OFFSET = '-03:00';

// The date is a calendar day in the YYYY-MM-DD format, already validated by
// the DTO.
export function startOfBrasiliaDay(date: string): Date {
  return new Date(`${date}T00:00:00.000${BRASILIA_UTC_OFFSET}`);
}

export function endOfBrasiliaDay(date: string): Date {
  return new Date(`${date}T23:59:59.999${BRASILIA_UTC_OFFSET}`);
}
