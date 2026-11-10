import { pricingConfig, type PricingConfig } from './config';

export type BreakdownLine = {
  key: 'items' | 'driverFare' | 'serviceFee' | 'tax';
  label: string;
  amount: number;
};

export type Breakdown = {
  lines: BreakdownLine[];
  total: number;
};

export type BreakdownInput = {
  itemsSubtotal?: number; // merchant items, RWF (restaurant and shop)
  driverFare: number;     // the locked, negotiated fare, RWF
};

export function buildBreakdown(
  input: BreakdownInput,
  config: PricingConfig = pricingConfig,
): Breakdown {
  const itemsSubtotal = input.itemsSubtotal ?? 0;
  const driverFare = input.driverFare;

  const serviceFee = Math.max(
    config.serviceFee.minimum,
    Math.round(driverFare * config.serviceFee.rate),
  );

  const taxBase =
    config.tax.base === 'serviceFee' ? serviceFee : driverFare + serviceFee;
  const tax = Math.round(taxBase * config.tax.rate);

  const lines: BreakdownLine[] = [];
  if (itemsSubtotal > 0)
    lines.push({ key: 'items', label: 'Items', amount: itemsSubtotal });
  lines.push({ key: 'driverFare', label: 'Driver transport fare', amount: driverFare });
  lines.push({ key: 'serviceFee', label: 'Service fee', amount: serviceFee });
  lines.push({ key: 'tax', label: 'Tax', amount: tax });

  // The total is the sum of the displayed lines, so it can never disagree with them.
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  return { lines, total };
}