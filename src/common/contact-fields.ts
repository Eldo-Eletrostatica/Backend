import { applyDecorators } from '@nestjs/common';
import { Matches, MinLength } from 'class-validator';

export const INVALID_PHONE_MESSAGE =
  'Informe um telefone com DDD, como (61) 99999-9999.';
export const INVALID_PERSON_NAME_MESSAGE =
  'Use só letras, espaços, apóstrofo ou hífen no nome.';
export const INVALID_COMPANY_NAME_MESSAGE =
  'A razão social precisa ter pelo menos 2 caracteres.';

// Brazilian phone, digits only (the site applies the mask): a two-digit area
// code that does not start with 0, then 8 digits for a landline or 9 starting
// with 9 for a mobile.
const BRAZILIAN_PHONE_PATTERN = /^[1-9]\d(?:9\d{8}|\d{8})$/;

// Letters (accented included), spaces, apostrophes and hyphens, starting and
// ending with a letter: at least 2 characters.
const PERSON_NAME_PATTERN = /^\p{L}[\p{L}' -]*\p{L}$/u;

const MIN_COMPANY_NAME_LENGTH = 2;

export function IsBrazilianPhone(): PropertyDecorator {
  return applyDecorators(
    Matches(BRAZILIAN_PHONE_PATTERN, { message: INVALID_PHONE_MESSAGE }),
  );
}

export function IsPersonName(): PropertyDecorator {
  return applyDecorators(
    Matches(PERSON_NAME_PATTERN, { message: INVALID_PERSON_NAME_MESSAGE }),
  );
}

// Company names carry digits and symbols ("S/A", "& Cia."), so only the length
// is checked.
export function IsCompanyName(): PropertyDecorator {
  return applyDecorators(
    MinLength(MIN_COMPANY_NAME_LENGTH, {
      message: INVALID_COMPANY_NAME_MESSAGE,
    }),
  );
}
