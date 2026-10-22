import { escapeCsvValue, formatMoney, toCsv } from './csv';

describe('escapeCsvValue', () => {
  it.each([
    ['Carlos Santos', 'Carlos Santos'],
    ['Vendedor; com ponto e vírgula', '"Vendedor; com ponto e vírgula"'],
    ['Nome "apelido"', '"Nome ""apelido"""'],
    ['=HYPERLINK("http://x")', '"\'=HYPERLINK(""http://x"")"'],
    ['+5511999999999', "'+5511999999999"],
    ['-10', "'-10"],
    ['@SUM(A1)', "'@SUM(A1)"],
    [42, '42'],
    [null, ''],
  ])('escapa %p como %p', (value, expected) => {
    expect(escapeCsvValue(value)).toBe(expected);
  });
});

describe('formatMoney', () => {
  it.each([
    [1500.5, '1500,50'],
    [0, '0,00'],
    [75.025, '75,03'],
  ])('formata %p como %p', (value, expected) => {
    expect(formatMoney(value)).toBe(expected);
  });
});

describe('toCsv', () => {
  it.each([
    [['A', 'B'], [], '﻿A;B'],
    [['A', 'B'], [['x', 1]], '﻿A;B\r\nx;1'],
  ])(
    'monta o arquivo com cabeçalho %p e linhas %p',
    (headers, rows, expected) => {
      expect(toCsv(headers, rows)).toBe(expected);
    },
  );
});
