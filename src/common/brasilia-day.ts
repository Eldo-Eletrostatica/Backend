import { BadRequestException } from '@nestjs/common';

// Brazil has had no daylight saving time since 2019, so Brasília is always
// UTC-3.
const BRASILIA_UTC_OFFSET = '-03:00';
const BRASILIA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

// The date is a calendar day in the YYYY-MM-DD format, already validated by
// the DTO.
export function startOfBrasiliaDay(date: string): Date {
  return new Date(`${date}T00:00:00.000${BRASILIA_UTC_OFFSET}`);
}

export function endOfBrasiliaDay(date: string): Date {
  return new Date(`${date}T23:59:59.999${BRASILIA_UTC_OFFSET}`);
}

export interface BrasiliaPeriod {
  start: Date;
  end: Date;
}

// The calendar day in Brasília for the given instant, in the YYYY-MM-DD
// format.
export function todayInBrasilia(now: Date = new Date()): string {
  const brasiliaInstant = new Date(now.getTime() - BRASILIA_UTC_OFFSET_MS);
  return brasiliaInstant.toISOString().slice(0, 10);
}

// Both days are whole days in Brasília time; the end day is included.
export function toBrasiliaPeriod(
  startDate: string,
  endDate: string,
): BrasiliaPeriod {
  const start = startOfBrasiliaDay(startDate);
  const end = endOfBrasiliaDay(endDate);
  if (start > end) {
    throw new BadRequestException(
      'A data inicial não pode ser posterior à data final.',
    );
  }
  return { start, end };
}
