import { ConflictException } from '@nestjs/common';
import {
  assertCompanyEventLimits,
  assertPortfolioLimits,
  ProjectsPerPortfolioCategory,
  withPortfolioCategoryRemoved,
  withPortfolioCategoryRenamed,
  withProjectMoved,
} from './showcase-limits';

// Builds the counts from one entry per category, e.g. counts(2, 1) is
// { A: 2, B: 1 }.
function counts(...totals: number[]): ProjectsPerPortfolioCategory {
  return new Map(
    totals.map((total, index) => [String.fromCharCode(65 + index), total]),
  );
}

describe('assertCompanyEventLimits', () => {
  it.each([
    ['creates the first event of an empty showcase', 0, 1],
    ['creates the tenth event', 9, 10],
    ['removes down to the minimum of three', 4, 3],
    ['removes an event of a showcase above the maximum', 12, 11],
  ])('accepts when it %s', (_case, current, next) => {
    expect(() => assertCompanyEventLimits(current, next)).not.toThrow();
  });

  it.each([
    ['creates an eleventh event', 10, 11, 'no máximo 10 eventos'],
    ['removes below the minimum', 3, 2, 'ao menos 3 eventos'],
    [
      'removes an event of a showcase still below the minimum',
      2,
      1,
      'ao menos 3 eventos',
    ],
  ])('rejects when it %s', (_case, current, next, message) => {
    const check = () => assertCompanyEventLimits(current, next);

    expect(check).toThrow(ConflictException);
    expect(check).toThrow(message);
  });
});

describe('assertPortfolioLimits', () => {
  it.each([
    ['the first project of an empty portfolio', counts(), counts(1)],
    ['the third project of a category', counts(2, 1, 1, 1), counts(3, 1, 1, 1)],
    ['the sixth category', counts(1, 1, 1, 1, 1), counts(1, 1, 1, 1, 1, 1)],
    [
      'a removal that keeps four categories',
      counts(1, 1, 1, 1, 1),
      counts(1, 1, 1, 1),
    ],
    [
      'a removal that keeps the category',
      counts(2, 1, 1, 1),
      counts(1, 1, 1, 1),
    ],
    [
      'a removal from a category above the maximum',
      counts(4, 1, 1, 1),
      counts(3, 1, 1, 1),
    ],
    [
      'a removal from a portfolio above the maximum of categories',
      counts(1, 1, 1, 1, 1, 1, 1, 1),
      counts(1, 1, 1, 1, 1, 1, 1),
    ],
  ])('accepts %s', (_case, current, next) => {
    expect(() => assertPortfolioLimits(current, next)).not.toThrow();
  });

  it.each([
    [
      'a fourth project in a category',
      counts(3, 1, 1, 1),
      counts(4, 1, 1, 1),
      'máximo de 3 projetos',
    ],
    [
      'a seventh category',
      counts(1, 1, 1, 1, 1, 1),
      counts(1, 1, 1, 1, 1, 1, 1),
      'no máximo 6 categorias',
    ],
    [
      'a removal that leaves three categories',
      counts(1, 1, 1, 1),
      counts(1, 1, 1),
      'ao menos 4 categorias',
    ],
  ])('rejects %s', (_case, current, next, message) => {
    const check = () => assertPortfolioLimits(current, next);

    expect(check).toThrow(ConflictException);
    expect(check).toThrow(message);
  });
});

describe('withProjectMoved', () => {
  it.each([
    ['creates a project in a new category', null, 'C', counts(2, 1, 1)],
    ['removes the last project of a category', 'B', null, counts(2)],
    ['moves a project to another category', 'A', 'B', counts(1, 2)],
  ])('%s', (_case, from, to, expected) => {
    expect(withProjectMoved(counts(2, 1), from, to)).toEqual(expected);
  });
});

describe('withPortfolioCategoryRenamed', () => {
  it.each([
    [
      'to a new name',
      'C',
      new Map([
        ['B', 1],
        ['C', 2],
      ]),
    ],
    ['to a name in use, merging both', 'B', new Map([['B', 3]])],
    ['to its own name', 'A', counts(2, 1)],
  ])('renames %s', (_case, newName, expected) => {
    expect(withPortfolioCategoryRenamed(counts(2, 1), 'A', newName)).toEqual(
      expected,
    );
  });
});

describe('withPortfolioCategoryRemoved', () => {
  it.each([
    ['a category with several projects', 'A', new Map([['B', 1]])],
    ['a category with one project', 'B', counts(2)],
  ])('removes %s', (_case, category, expected) => {
    expect(withPortfolioCategoryRemoved(counts(2, 1), category)).toEqual(
      expected,
    );
  });
});
