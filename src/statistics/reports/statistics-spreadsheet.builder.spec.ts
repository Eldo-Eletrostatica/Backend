import { Workbook } from 'exceljs';
import { StatisticsResponseDto } from '../dto/statistics-response.dto';
import {
  INDICATORS_SHEET_NAME,
  PAINT_TYPES_SHEET_NAME,
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

describe('StatisticsSpreadsheetBuilder', () => {
  let workbook: Workbook;

  // Builds the file once and reads it back, as Excel would open it.
  beforeAll(async () => {
    const file = await new StatisticsSpreadsheetBuilder().build(
      OCTOBER_STATISTICS,
    );
    workbook = new Workbook();
    // exceljs types load() with its own Buffer, which is an ArrayBuffer.
    await workbook.xlsx.load(new Uint8Array(file).buffer);
  });

  it.each([
    ['B2', '01/10/2026 a 31/10/2026'],
    ['A4', 'Orçamentos'],
    ['B4', 10],
    ['B5', 3],
    ['B6', '30,00%'],
  ])('a aba de indicadores tem %s = %p', (cellAddress, expectedValue) => {
    const sheet = workbook.getWorksheet(INDICATORS_SHEET_NAME);

    expect(sheet?.getCell(cellAddress).value).toBe(expectedValue);
  });

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
