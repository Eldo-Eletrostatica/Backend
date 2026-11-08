import { applyDecorators } from '@nestjs/common';
import { IsEmail, IsNotEmpty, Matches, MinLength } from 'class-validator';

export const INVALID_PHONE_MESSAGE =
  'Informe um telefone com DDD, como (61) 99999-9999.';
export const INVALID_EMAIL_MESSAGE =
  'Informe um e-mail válido, como nome@email.com.';
export const INVALID_INDIVIDUAL_CUSTOMER_NAME_MESSAGE =
  'Use só letras, espaços, apóstrofo ou hífen no nome.';
export const INVALID_BUSINESS_CUSTOMER_NAME_MESSAGE =
  'A razão social precisa ter pelo menos 2 caracteres.';

// Aliases for compatibility
export const INVALID_PERSON_NAME_MESSAGE =
  INVALID_INDIVIDUAL_CUSTOMER_NAME_MESSAGE;
export const INVALID_COMPANY_NAME_MESSAGE =
  INVALID_BUSINESS_CUSTOMER_NAME_MESSAGE;

// Brazilian phone, digits only (the site applies the mask): a two-digit area
// code that does not start with 0, then 8 digits for a landline (starting with
// 2 to 5) or 9 starting with 9 for a mobile.
export const BRAZILIAN_PHONE_PATTERN = /^[1-9]\d(?:9\d{8}|[2-5]\d{7})$/;

// Letters (accented included), spaces, apostrophes (both ASCII ' and typographic ’)
// and hyphens, starting and ending with a letter: at least 2 characters.
export const INDIVIDUAL_CUSTOMER_NAME_PATTERN = /^\p{L}[\p{L}'’ -]*\p{L}$/u;

export const MIN_BUSINESS_CUSTOMER_NAME_LENGTH = 2;

export function IsBrazilianPhone(): PropertyDecorator {
  return applyDecorators(
    Matches(BRAZILIAN_PHONE_PATTERN, { message: INVALID_PHONE_MESSAGE }),
  );
}

export function IsIndividualCustomerName(): PropertyDecorator {
  return applyDecorators(
    Matches(INDIVIDUAL_CUSTOMER_NAME_PATTERN, {
      message: INVALID_INDIVIDUAL_CUSTOMER_NAME_MESSAGE,
    }),
  );
}

// Company names carry digits and symbols ("S/A", "& Cia."), so only the length
// is checked.
export function IsBusinessCustomerName(): PropertyDecorator {
  return applyDecorators(
    MinLength(MIN_BUSINESS_CUSTOMER_NAME_LENGTH, {
      message: INVALID_BUSINESS_CUSTOMER_NAME_MESSAGE,
    }),
  );
}

export function IsCustomerEmail(): PropertyDecorator {
  return applyDecorators(
    IsNotEmpty(),
    IsEmail({}, { message: INVALID_EMAIL_MESSAGE }),
  );
}

// Aliases for compatibility
export const IsPersonName = IsIndividualCustomerName;
export const IsCompanyName = IsBusinessCustomerName;
