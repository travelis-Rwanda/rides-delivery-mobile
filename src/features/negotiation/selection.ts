import type { DeliveryRequest } from '../delivery/model';
import type { ServiceId } from '../delivery/services';
import type { Coordinate } from '../maps/places';
import { straightLineKm } from '../pricing/minimumFare';

type Size = DeliveryRequest['size'];

export type VehicleKind = 'moto' | 'cab' | 'hilux';

export type Driver = {
  id: string;
  name: string;
  vehicle: string; // label shown to the customer
  kind: VehicleKind;
  location: Coordinate; // last known position
};

// PLACEHOLDER RULES. Which vehicle can carry which job is decided by
// operations; until then, cargo needs a pickup truck and large parcels need
// more than a motorbike.
export function vehicleFits(
  kind: VehicleKind,
  job: { service: ServiceId; size: Size },
): boolean {
  if (job.service === 'cargo') return kind === 'hilux';
  if (job.size === 'Large') return kind !== 'moto';
  return true;
}

export type RankedDriver = {
  driver: Driver;
  ask: number; // the driver's opening price, whole RWF
  distanceKm: number | null; // straight line to the pickup, if it is pinned
};

export type DriverChoice = {
  ranked: RankedDriver[]; // best first
  basis: 'nearest' | 'cheapest';
  // The delivery was urgent but the pickup is not pinned on the map, so the
  // nearest driver could not be worked out and the cheapest was chosen.
  fellBack: boolean;
};

// Distances are compared to the nearest 0.1 km, so a few metres of difference
// never outweighs a clearly lower price.
const tenthsOfKm = (km: number) => Math.round(km * 10);

// Urgent deliveries go to the driver nearest the pickup. Other deliveries go
// to the driver asking the lowest price. Ties fall back to the other measure,
// then to the driver id, so the order is always the same.
export function rankDrivers(input: {
  urgent: boolean;
  pickup?: Coordinate;
  service: ServiceId;
  size: Size;
  drivers: readonly Driver[];
  asks: Readonly<Record<string, number>>;
}): DriverChoice {
  const candidates: RankedDriver[] = input.drivers.flatMap((driver) => {
    const ask = input.asks[driver.id];
    if (ask === undefined || !vehicleFits(driver.kind, input)) return [];
    return [
      {
        driver,
        ask,
        distanceKm: input.pickup
          ? straightLineKm(input.pickup, driver.location)
          : null,
      },
    ];
  });

  const byNearest = input.urgent && input.pickup !== undefined;
  const nearness = (a: RankedDriver, b: RankedDriver) =>
    a.distanceKm === null || b.distanceKm === null
      ? 0
      : tenthsOfKm(a.distanceKm) - tenthsOfKm(b.distanceKm);
  const price = (a: RankedDriver, b: RankedDriver) => a.ask - b.ask;

  const ranked = [...candidates].sort(
    (a, b) =>
      (byNearest
        ? nearness(a, b) || price(a, b)
        : price(a, b) || nearness(a, b)) ||
      a.driver.id.localeCompare(b.driver.id),
  );

  return {
    ranked,
    basis: byNearest ? 'nearest' : 'cheapest',
    fellBack: input.urgent && input.pickup === undefined,
  };
}

// The best driver who has not already been tried, for when a driver declines
// or the haggling with them ends without a deal.
export function nextBestDriver(
  choice: DriverChoice,
  tried: readonly string[],
): RankedDriver | undefined {
  return choice.ranked.find((entry) => !tried.includes(entry.driver.id));
}

// What a delivery needs from a driver, taken from the saved request.
export type Job = {
  service: ServiceId;
  size: Size;
  urgent: boolean;
  pickup?: Coordinate;
};

export function jobOf(request: DeliveryRequest): Job {
  return {
    service: request.service,
    size: request.size,
    urgent: request.urgent === true,
    pickup: request.pickupPoint,
  };
}