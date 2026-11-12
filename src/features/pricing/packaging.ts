import type { Breakdown } from './breakdown';
import { pricingConfig, type Size } from './config';

// PLACEHOLDER VALUES
// TODO: Get these from the backend. The backend should return a pricing
export const packagingConfig = {
  // Extra fee when the customer asks for the item to be packaged, in RWF.
  fee: { Small: 500, Medium: 1000, Large: 2000 } as Record<Size, number>,
  // Packaging is a Travelis service, so tax is charged on it at the same rate
  // as the service fee. Confirm this with the tax authorities.
  taxed: true,
};

export type PackagingConfig = typeof packagingConfig;

export function packagingFee(
  size: Size,
  config: PackagingConfig = packagingConfig,
): number {
  return config.fee[size];
}

// Adds the packaging fee as its own line, and the tax on it to the tax line.
// The price agreed with the driver is not touched.
export function addPackaging(
  breakdown: Breakdown,
  size: Size,
  config: PackagingConfig = packagingConfig,
  taxRate: number = pricingConfig.tax.rate,
): Breakdown {
  const fee = packagingFee(size, config);
  const tax = config.taxed ? Math.round(fee * taxRate) : 0;
  return {
    lines: breakdown.lines.flatMap((line) =>
      line.key === 'tax'
        ? [
            { key: 'packaging' as const, label: 'Packaging', amount: fee },
            { ...line, amount: line.amount + tax },
          ]
        : [line],
    ),
    total: breakdown.total + fee + tax,
  };
}