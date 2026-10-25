import { ConflictException } from '@nestjs/common';
import {
  MAX_COMPANY_EVENTS,
  MAX_PORTFOLIO_CATEGORIES,
  MAX_PROJECTS_PER_CATEGORY,
  MIN_COMPANY_EVENTS,
  MIN_PORTFOLIO_CATEGORIES,
} from './showcase-items.constants';

// Number of portfolio projects in each category.
export type ProjectsPerPortfolioCategory = Map<string, number>;

// A total outside the limit is still accepted when the change moves it towards
// the limit, so the admin can fill an empty showcase one item at a time.
function isAboveMax(current: number, next: number, max: number): boolean {
  return next > max && next > current;
}

function isBelowMin(current: number, next: number, min: number): boolean {
  return next < min && next < current;
}

export function assertCompanyEventLimits(current: number, next: number): void {
  if (isAboveMax(current, next, MAX_COMPANY_EVENTS)) {
    throw new ConflictException(
      `A vitrine aceita no máximo ${MAX_COMPANY_EVENTS} eventos.`,
    );
  }
  if (isBelowMin(current, next, MIN_COMPANY_EVENTS)) {
    throw new ConflictException(
      `A vitrine precisa manter ao menos ${MIN_COMPANY_EVENTS} eventos.`,
    );
  }
}

export function assertPortfolioLimits(
  current: ProjectsPerPortfolioCategory,
  next: ProjectsPerPortfolioCategory,
): void {
  for (const [category, total] of next) {
    if (
      isAboveMax(current.get(category) ?? 0, total, MAX_PROJECTS_PER_CATEGORY)
    ) {
      throw new ConflictException(
        `A categoria "${category}" já tem o máximo de ${MAX_PROJECTS_PER_CATEGORY} projetos.`,
      );
    }
  }
  if (isAboveMax(current.size, next.size, MAX_PORTFOLIO_CATEGORIES)) {
    throw new ConflictException(
      `O portfólio aceita no máximo ${MAX_PORTFOLIO_CATEGORIES} categorias.`,
    );
  }
  if (isBelowMin(current.size, next.size, MIN_PORTFOLIO_CATEGORIES)) {
    throw new ConflictException(
      `O portfólio precisa manter ao menos ${MIN_PORTFOLIO_CATEGORIES} categorias.`,
    );
  }
}

// The counts after moving one project between categories; null stands for a
// project being created (from) or removed (to).
export function withProjectMoved(
  current: ProjectsPerPortfolioCategory,
  from: string | null,
  to: string | null,
): ProjectsPerPortfolioCategory {
  const next = new Map(current);
  if (from !== null) {
    const remaining = (next.get(from) ?? 0) - 1;
    if (remaining > 0) {
      next.set(from, remaining);
    } else {
      next.delete(from);
    }
  }
  if (to !== null) {
    next.set(to, (next.get(to) ?? 0) + 1);
  }
  return next;
}

// The counts after renaming a category; a name already in use merges both.
export function withPortfolioCategoryRenamed(
  current: ProjectsPerPortfolioCategory,
  category: string,
  newName: string,
): ProjectsPerPortfolioCategory {
  const next = new Map(current);
  const moved = next.get(category) ?? 0;
  next.delete(category);
  next.set(newName, (next.get(newName) ?? 0) + moved);
  return next;
}

export function withPortfolioCategoryRemoved(
  current: ProjectsPerPortfolioCategory,
  category: string,
): ProjectsPerPortfolioCategory {
  const next = new Map(current);
  next.delete(category);
  return next;
}
