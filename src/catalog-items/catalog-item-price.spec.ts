import {
  findPriceProblem,
  PAINT_TYPE_PRICE_MESSAGE,
  PART_MATERIAL_PRICE_MESSAGE,
} from './catalog-item-price';
import { CatalogItemType } from './entities/catalog-item.entity';

describe('findPriceProblem', () => {
  it.each([
    [CatalogItemType.PaintType, 45.5, null, null],
    [CatalogItemType.PaintType, null, null, PAINT_TYPE_PRICE_MESSAGE],
    [CatalogItemType.PaintType, 45.5, 1.2, PAINT_TYPE_PRICE_MESSAGE],
    [CatalogItemType.PaintType, null, 1.2, PAINT_TYPE_PRICE_MESSAGE],
    [CatalogItemType.PartMaterial, null, 1.2, null],
    [CatalogItemType.PartMaterial, null, null, PART_MATERIAL_PRICE_MESSAGE],
    [CatalogItemType.PartMaterial, 45.5, 1.2, PART_MATERIAL_PRICE_MESSAGE],
    [CatalogItemType.PartMaterial, 45.5, null, PART_MATERIAL_PRICE_MESSAGE],
  ])(
    'um %s com preço por m² %p e fator %p tem o problema %p',
    (type, pricePerM2, priceFactor, expectedProblem) => {
      expect(findPriceProblem(type, pricePerM2, priceFactor)).toBe(
        expectedProblem,
      );
    },
  );
});
