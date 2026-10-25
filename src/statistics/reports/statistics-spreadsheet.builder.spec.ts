import { Workbook } from 'exceljs';
import { StatisticsResponseDto } from '../dto/statistics-response.dto';
import { NO_CONVERSION_RATE_TEXT } from './report-format';
import {
  INDICATORS_SHEET_NAME,
  PAINT_TYPES_SHEET_NAME,
  PERCENT_FORMAT,
  StatisticsSpreadsheetBuilder,
} from './statistics-spreadsheet.builder';

const OCTOBER_STATISTICS: StatisticsResponseDto = {
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  hasData: true,
  quoteCount: 10,
  convertedQuoteCount: 3,
  conversionRate: 0.3,
  topPaintTypes: [
    { catalogItemId: 'epoxy-id', name: 'Epóxi', orderCount: 5 },
    { catalogItemId: 'powder-id', name: 'Pintura a pó', orderCount: 3 },
  ],
};

// Builds the file and reads it back, as Excel would open it.
async function buildAndRead(
  statistics: StatisticsResponseDto,
): Promise<Workbook> {
  const file = await new StatisticsSpreadsheetBuilder().build(statistics);
  const workbook = new Workbook();
  // exceljs types load() with its own Buffer, which is an ArrayBuffer.
  await workbook.xlsx.load(new Uint8Array(file).buffer);
  return workbook;
}

describe('StatisticsSpreadsheetBuilder', () => {
  let workbook: Workbook;

  beforeAll(async () => {
    workbook = await buildAndRead(OCTOBER_STATISTICS);
  });

  it.each([
    ['B2', '01/10/2026 a 31/10/2026'],
    ['A4', 'Orçamentos'],
    ['B4', 10],
    ['B5', 3],
  ])('a aba de indicadores tem %s = %p', (cellAddress, expectedValue) => {
    const sheet = workbook.getWorksheet(INDICATORS_SHEET_NAME);

    expect(sheet?.getCell(cellAddress).value).toBe(expectedValue);
  });

  it.each([
    [0.3, 0.3, PERCENT_FORMAT],
    [null, NO_CONVERSION_RATE_TEXT, undefined],
  ])(
    'grava a taxa de conversão %p como %p, com o formato %p',
    async (conversionRate, expectedValue, expectedFormat) => {
      const sheet = (
        await buildAndRead({ ...OCTOBER_STATISTICS, conversionRate })
      ).getWorksheet(INDICATORS_SHEET_NAME);

      expect(sheet?.getCell('B6').value).toBe(expectedValue);
      expect(sheet?.getCell('B6').numFmt).toBe(expectedFormat);
    },
  );

  it.each([
    [1, ['Posição', 'Tipo de pintura', 'Pedidos']],
    [2, [1, 'Epóxi', 5]],
    [3, [2, 'Pintura a pó', 3]],
  ])(
    'a aba de tipos de pintura tem na linha %i os valores %j',
    (rowNumber, expectedValues) => {
      const sheet = workbook.getWorksheet(PAINT_TYPES_SHEET_NAME);
      const row = sheet?.getRow(rowNumber);

      expect([1, 2, 3].map((column) => row?.getCell(column).value)).toEqual(
        expectedValues,
      );
    },
  );
});
