import { CommissionType } from '../employees/entities/employee.entity';
import { calculateCommission, NO_COMMISSION } from './commission';

describe('calculateCommission', () => {
  it.each([
    [CommissionType.Percentage, 5, 1000, 50],
    [CommissionType.Percentage, 2.5, 1234.56, 30.86],
    [CommissionType.Percentage, 0.1, 0.05, 0],
    [CommissionType.Fixed, 150, 1000, 150],
    [CommissionType.Fixed, 150, 80, 150],
  ])(
    'aplica a regra %s de %s sobre a venda de %s e dá %s',
    (commissionType, commissionValue, saleValue, expectedCommission) => {
      expect(
        calculateCommission({ commissionType, commissionValue }, saleValue),
      ).toBe(expectedCommission);
    },
  );

  it.each([
    [null, null],
    [CommissionType.Percentage, null],
    [null, 5],
  ])(
    'não dá comissão quando a regra é tipo %s e valor %s',
    (commissionType, commissionValue) => {
      expect(
        calculateCommission({ commissionType, commissionValue }, 1000),
      ).toBe(NO_COMMISSION);
    },
  );
});
