import type { ServiceId } from '../delivery/services';

export type Size = 'Small' | 'Medium' | 'Large';

export type FareRule = {
  baseFare: number;       // flat amount for any trip
  perKm: number;          // added per kilometre
  perMinute: number;      // added per minute of driving
  minimumFare: number;    // the floor, whatever the formula says
  sizeSurcharge: Record<Size, number>;
};

export type PricingConfig = {
  fare: Record<'parcel' | 'cargo', FareRule>;
  serviceFee: {
    rate: number;      // share of the driver fare, e.g. 0.1 = 10%
    minimum: number;   // never charge less than this (RWF)
  };
  tax: {
    rate: number;      // e.g. 0.18 = 18%
    base: 'serviceFee' | 'fareAndFee'; // what the tax is charged on
  };
  roundTo: number;
  detourFactor: number;
};

// PLACEHOLDER VALUES
export const pricingConfig: PricingConfig = {
  fare: {
    parcel: {
      baseFare: 1000,
      perKm: 350,
      perMinute: 20,
      minimumFare: 1500,
      sizeSurcharge: { Small: 0, Medium: 500, Large: 1500 },
    },
    cargo: {
      baseFare: 5000,
      perKm: 600,
      perMinute: 30,
      minimumFare: 8000,
      sizeSurcharge: { Small: 0, Medium: 2000, Large: 5000 },
    },
  },
  serviceFee: { rate: 0.1, minimum: 300 },
  tax: { rate: 0.18, base: 'serviceFee' },
  roundTo: 100,
  detourFactor: 1.3,
};

export type FareService = keyof PricingConfig['fare'];

// Negotiation applies to parcel and cargo only for now.
export const isFareService = (id: ServiceId): id is FareService =>
  id === 'parcel' || id === 'cargo';