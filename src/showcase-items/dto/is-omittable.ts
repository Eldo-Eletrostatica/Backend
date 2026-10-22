import { ValidateIf } from 'class-validator';

// Omitted fields are skipped, but null is rejected (the columns are NOT NULL).
export const IsOmittable = () => ValidateIf((_, value) => value !== undefined);
