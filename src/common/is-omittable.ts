import { ValidateIf } from 'class-validator';

// @IsOptional also lets null through. In a PATCH, a field marked with this may
// be left out but never cleared with null.
export const IsOmittable = () =>
  ValidateIf((_object: object, value: unknown) => value !== undefined);
