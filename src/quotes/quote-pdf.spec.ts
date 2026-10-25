import { isPdf } from './quote-pdf';

describe('isPdf', () => {
  it.each([
    ['um PDF', Buffer.from('%PDF-1.7\n%âãÏÓ'), true],
    ['um PDF mínimo', Buffer.from('%PDF-'), true],
    ['um PNG', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]), false],
    ['um texto que começa parecido', Buffer.from('%PD'), false],
    ['um arquivo vazio', Buffer.alloc(0), false],
  ])('reconhece %s pelos primeiros bytes: %s', (_, content, expected) => {
    expect(isPdf(content)).toBe(expected);
  });
});
