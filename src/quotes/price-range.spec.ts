import { calculatePriceRange, PricedItem } from './price-range';

const STEEL_EPOXY_ITEM: PricedItem = {
  areaM2: 2,
  quantity: 3,
  pricePerM2: 50,
  priceFactor: 1,
};
const ALUMINIUM_POWDER_ITEM: PricedItem = {
  areaM2: 1.5,
  quantity: 2,
  pricePerM2: 40,
  priceFactor: 1.2,
};

describe('calculatePriceRange', () => {
  it.each([
    [[STEEL_EPOXY_ITEM], 15, { minPrice: 300, maxPrice: 345 }],
    [[STEEL_EPOXY_ITEM], 0, { minPrice: 300, maxPrice: 300 }],
    [
      [STEEL_EPOXY_ITEM, ALUMINIUM_POWDER_ITEM],
      10,
      { minPrice: 444, maxPrice: 488.4 },
    ],
  ])(
    'com os itens %j e margem de %i%%, a faixa é %j',
    (items, negotiationMargin, expectedRange) => {
      expect(calculatePriceRange(items, negotiationMargin)).toEqual(
        expectedRange,
      );
    },
  );

  it.each([
    [{ areaM2: 0.333, quantity: 1, pricePerM2: 45.5, priceFactor: 1 }, 15.15],
    [{ areaM2: 0.125, quantity: 3, pricePerM2: 33.33, priceFactor: 1.2 }, 15],
  ])(
    'arredonda o preço do item %j para os centavos: %p',
    (item, expectedMinPrice) => {
      expect(calculatePriceRange([item], 0).minPrice).toBe(expectedMinPrice);
    },
  );
});
