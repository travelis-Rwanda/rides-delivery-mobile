import { pricingConfig, type PricingConfig } from './config';

export type BreakdownLine = {
  key: 'items' | 'driverFare' | 'serviceFee' | 'packaging' | 'tax';
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

// What the customer pays in total for a given driver fare, with the service
// fee and tax on top.
export function totalForDriverFare(
  driverFare: number,
  config: PricingConfig = pricingConfig,
): number {
  return buildBreakdown({ driverFare }, config).total;
}

// The reverse of the above. The customer and driver agree one total that
// already includes the service fee and tax, so this splits it back into the
// driver's fare, the service fee and the tax. The lines add up to the agreed
// total exactly. Returns null for a total too small to cover the fees.
export function breakdownForTotal(
  total: number,
  config: PricingConfig = pricingConfig,
): Breakdown | null {
  if (!Number.isSafeInteger(total) || total < totalForDriverFare(0, config))
    return null;

  // The total grows with every extra franc of driver fare, so the right fare
  // can be found by halving the range until it fits.
  let low = 0;
  let high = total;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (totalForDriverFare(mid, config) <= total) low = mid;
    else high = mid - 1;
  }

  const built = buildBreakdown({ driverFare: low }, config);
  // Rounding the fee and tax can leave a franc or two over. That goes to the
  // service fee, so the driver's share never drops when the total goes up and
  // the lines still match the agreed total exactly.
  const leftover = total - built.total;
  return {
    lines: built.lines.map((line) =>
      line.key === 'serviceFee'
        ? { ...line, amount: line.amount + leftover }
        : line,
    ),
    total,
  };
}

// The driver's share of an agreed total, after the service fee and tax.
export function driverFareForTotal(
  total: number,
  config: PricingConfig = pricingConfig,
): number | null {
  const breakdown = breakdownForTotal(total, config);
  return breakdown
    ? (breakdown.lines.find((line) => line.key === 'driverFare')?.amount ?? null)
    : null;
}