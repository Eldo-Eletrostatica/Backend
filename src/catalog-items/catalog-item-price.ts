import { CatalogItemType } from './entities/catalog-item.entity';

export const PAINT_TYPE_PRICE_MESSAGE =
  'Um tipo de pintura tem preço por m² (pricePerM2) e não tem fator (priceFactor).';
export const PART_MATERIAL_PRICE_MESSAGE =
  'Um material da peça tem fator (priceFactor) e não tem preço por m² (pricePerM2).';

// Mirrors CHK_catalog_items_price, so a wrong combination is a 400 with a clear
// message instead of a constraint error from the database. Returns the
// problem, or null when the prices fit the type.
export function findPriceProblem(
  type: CatalogItemType,
  pricePerM2: number | null,
  priceFactor: number | null,
): string | null {
  if (type === CatalogItemType.PaintType) {
    return pricePerM2 !== null && priceFactor === null
      ? null
      : PAINT_TYPE_PRICE_MESSAGE;
  }
  return priceFactor !== null && pricePerM2 === null
    ? null
    : PART_MATERIAL_PRICE_MESSAGE;
}
