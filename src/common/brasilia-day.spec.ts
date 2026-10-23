import { BadRequestException } from '@nestjs/common';
import {
  endOfBrasiliaDay,
  startOfBrasiliaDay,
  toBrasiliaPeriod,
  todayInBrasilia,
} from './brasilia-day';

describe('startOfBrasiliaDay', () => {
  it.each([
    ['2026-10-01', '2026-10-01T03:00:00.000Z'],
    ['2026-12-31', '2026-12-31T03:00:00.000Z'],
    ['2028-02-29', '2028-02-29T03:00:00.000Z'],
  ])('começa o dia %s às 0h de Brasília (%s)', (date, expectedInstant) => {
    expect(startOfBrasiliaDay(date).toISOString()).toBe(expectedInstant);
  });
});

describe('endOfBrasiliaDay', () => {
  it.each([
    ['2026-10-01', '2026-10-02T02:59:59.999Z'],
    ['2026-12-31', '2027-01-01T02:59:59.999Z'],
    ['2028-02-29', '2028-03-01T02:59:59.999Z'],
  ])(
    'termina o dia %s às 23:59:59.999 de Brasília (%s)',
    (date, expectedInstant) => {
      expect(endOfBrasiliaDay(date).toISOString()).toBe(expectedInstant);
    },
  );
});

describe('todayInBrasilia', () => {
  it.each([
    [
      'antes da meia-noite de Brasília',
      '2026-10-22T02:59:59.999Z',
      '2026-10-21',
    ],
    ['na virada do dia de Brasília', '2026-10-22T03:00:00.000Z', '2026-10-22'],
    ['no fim do dia de Brasília', '2026-12-31T23:00:00.000Z', '2026-12-31'],
  ])('%s devolve a data %s', (_label, instant, expectedDate) => {
    expect(todayInBrasilia(new Date(instant))).toBe(expectedDate);
  });
});

describe('toBrasiliaPeriod', () => {
  it.each([
    ['2026-10-01', '2026-10-31'],
    ['2026-10-15', '2026-10-15'],
  ])('aceita o período de %s a %s', (startDate, endDate) => {
    expect(toBrasiliaPeriod(startDate, endDate)).toEqual({
      start: startOfBrasiliaDay(startDate),
      end: endOfBrasiliaDay(endDate),
    });
  });

  it.each([
    ['2026-10-31', '2026-10-01'],
    ['2026-12-01', '2026-11-30'],
  ])('rejeita o período invertido de %s a %s', (startDate, endDate) => {
    expect(() => toBrasiliaPeriod(startDate, endDate)).toThrow(
      new BadRequestException(
        'A data inicial não pode ser posterior à data final.',
      ),
    );
  });
});
