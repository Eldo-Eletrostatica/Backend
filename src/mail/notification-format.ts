// Formats for the plain text of the company notices, in Brazilian notation.

// Intl separates the currency symbol with a no-break space; a plain space
// reads the same and survives copy and paste.
const MONEY_FORMAT = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const AREA_FORMAT = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3,
});

// (61) 99999-8888 for mobiles and (61) 3333-4444 for landlines.
export function formatPhone(digits: string): string {
  const match = /^(\d{2})(\d{4,5})(\d{4})$/.exec(digits);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : digits;
}

// 12.345.678/0001-99.
export function formatCnpj(digits: string): string {
  const match = /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/.exec(digits);
  return match
    ? `${match[1]}.${match[2]}.${match[3]}/${match[4]}-${match[5]}`
    : digits;
}

export function formatMoney(value: number): string {
  return MONEY_FORMAT.format(value).replace(/\u00a0/g, ' ');
}

export function formatArea(areaM2: number): string {
  return AREA_FORMAT.format(areaM2);
}

// 2030-01-15 becomes 15/01/2030.
export function formatDateOnly(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}
