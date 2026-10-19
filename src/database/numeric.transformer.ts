import { ValueTransformer } from 'typeorm';

// The pg driver returns numeric columns as strings to avoid precision loss;
// the values used here (prices, quantities) fit safely in a JS number.
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null | undefined) =>
    value === null || value === undefined ? null : Number(value),
};
