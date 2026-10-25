export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;
export const TITLE_MAX_LENGTH = 150;
export const CATEGORY_MAX_LENGTH = 100;
export const SERVICE_TYPE_MAX_LENGTH = 150;
export const MATERIALS_MAX_LENGTH = 255;

export const SHOWCASE_IMAGES_FOLDER = 'showcase';

// Content limits of the showcase (US27). A category with no project stops
// existing, so the minimum of one project per category needs no check.
export const MIN_COMPANY_EVENTS = 3;
export const MAX_COMPANY_EVENTS = 10;
export const MIN_PORTFOLIO_CATEGORIES = 4;
export const MAX_PORTFOLIO_CATEGORIES = 6;
export const MAX_PROJECTS_PER_CATEGORY = 3;

// The event date is a calendar day; the strict ISO 8601 check that follows the
// pattern rejects days that do not exist, such as 2026-02-30.
export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
