// Text shared by the PDF and the spreadsheet, so both files say the same
// thing the dashboard shows.
export const REPORT_TITLE = 'Relatório de análises estatísticas';
export const NO_CONVERSION_RATE_TEXT = 'Sem orçamentos no período';

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// The date is a YYYY-MM-DD day already validated by the DTO; splitting the
// text avoids a time zone shifting it to the previous day.
export function formatDay(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function formatPeriod(startDate: string, endDate: string): string {
  return `${formatDay(startDate)} a ${formatDay(endDate)}`;
}

export function formatConversionRate(conversionRate: number | null): string {
  if (conversionRate === null) {
    return NO_CONVERSION_RATE_TEXT;
  }
  return percentFormatter.format(conversionRate);
}
