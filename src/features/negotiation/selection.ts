import type { DeliveryRequest } from '../delivery/model';
import type { ServiceId } from '../delivery/services';
import type { Coordinate } from '../maps/places';
import { straightLineKm } from '../pricing/minimumFare';

type Size = DeliveryRequest['size'];

// Smallest first.
export const vehicleKinds = ['moto', 'cab', 'hilux'] as const;
export type VehicleKind = (typeof vehicleKinds)[number];

export type Driver = {
  id: string;
  name: string;
  vehicle: string; // label shown to the customer
  kind: VehicleKind;
  location: Coordinate; // last known position
};

export const vehicleLabels: Record<VehicleKind, string> = {
  moto: 'Moto Bike',
  cab: 'Cab Taxi',
  hilux: 'Light Hilux',
};

// How much each vehicle can carry, smallest first.
const capacity: Record<VehicleKind, number> = { moto: 1, cab: 2, hilux: 3 };

// What a vehicle is picked for: the item, and the customer's own choice if
// they made one.
type VehicleJob = { service: ServiceId; size: Size; vehicle?: VehicleKind };

// PLACEHOLDER RULES. The vehicle suggested for a job depends on its size, and
// operations will confirm the real limits. Cargo always needs a pickup truck.
export function suggestedVehicle(job: {
  service: ServiceId;
  size: Size;
}): VehicleKind {
  if (job.service === 'cargo') return 'hilux';
  if (job.size === 'Large') return 'hilux';
  return job.size === 'Medium' ? 'cab' : 'moto';
}

// The vehicles a customer can choose from. Cargo needs a pickup truck; a parcel
// can go in any of them, even one smaller than we suggest (the form warns).
export function vehicleOptions(job: {
  service: ServiceId;
}): readonly VehicleKind[] {
  return job.service === 'cargo' ? ['hilux'] : vehicleKinds;
}

// The vehicle the customer asked for, or the suggested one when they did not
// choose. A choice that is not allowed for the service is ignored.
export function requestedVehicle(job: VehicleJob): VehicleKind {
  return job.vehicle && vehicleOptions(job).includes(job.vehicle)
    ? job.vehicle
    : suggestedVehicle(job);
}

// A driver can take the job when their vehicle can carry at least as much as
// the one requested, so a cab can take a small parcel but a motorbike cannot
// take a medium one.
export function vehicleFits(kind: VehicleKind, job: VehicleJob): boolean {
  return capacity[kind] >= capacity[requestedVehicle(job)];
}

// A gentle warning when the customer picks something smaller than we suggest.
export function vehicleWarning(job: VehicleJob): string | undefined {
  const asked = requestedVehicle(job);
  const suggested = suggestedVehicle(job);
  if (capacity[asked] >= capacity[suggested]) return undefined;
  return `${vehicleLabels[asked]} is smaller than the ${vehicleLabels[suggested]} we suggest for a ${job.size.toLowerCase()} item. A driver may decline it.`;
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
  vehicle?: VehicleKind;
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
  vehicle?: VehicleKind;
  pickup?: Coordinate;
};

export function jobOf(request: DeliveryRequest): Job {
  return {
    service: request.service,
    size: request.size,
    urgent: request.urgent === true,
    vehicle: request.vehicle,
    pickup: request.pickupPoint,
  };
}