import type { Trip } from './trip';

// What a driver has earned from one completed delivery: their share of the
// agreed fare plus any tip. The service fee and tax are never the driver's.
export type EarningsRow = {
  requestId: string;
  completedAt: string;
  fare: number;
  tip: number;
  total: number;
};

export type EarningsSummary = {
  today: number;
  thisWeek: number;
  allTime: number;
  deliveries: number; // completed deliveries
  ratingCount: number;
  averageRating?: number; // 1 to 5, one decimal, when there are ratings
};

// When the customer confirmed the delivery. Earnings count from that moment,
// and a tip that arrives later belongs to the same delivery.
export const completedAt = (trip: Trip) =>
  trip.history.find((event) => event.status === 'completed')?.at;

// Every completed delivery for this driver, newest first.
export function earningsHistory(
  trips: Record<string, Trip>,
  driverId: string,
): EarningsRow[] {
  const rows: EarningsRow[] = [];
  for (const trip of Object.values(trips)) {
    const at = completedAt(trip);
    if (trip.driverId !== driverId || trip.status !== 'completed' || !at)
      continue;
    const tip = trip.tip ?? 0;
    rows.push({
      requestId: trip.requestId,
      completedAt: at,
      fare: trip.driverFare,
      tip,
      total: trip.driverFare + tip,
    });
  }
  return rows.sort(
    (a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt),
  );
}

// Midnight at the start of the current day, on the phone's clock.
export const startOfDay = (nowMs: number) => {
  const now = new Date(nowMs);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
};

// Midnight at the start of the current week. Weeks start on Monday.
export const startOfWeek = (nowMs: number) => {
  const now = new Date(nowMs);
  const sinceMonday = (now.getDay() + 6) % 7;
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - sinceMonday,
  ).getTime();
};

export function driverEarnings(
  trips: Record<string, Trip>,
  driverId: string,
  nowMs: number,
): EarningsSummary {
  const dayStart = startOfDay(nowMs);
  const weekStart = startOfWeek(nowMs);
  const rows = earningsHistory(trips, driverId);
  const sum = (from: number) =>
    rows
      .filter((row) => Date.parse(row.completedAt) >= from)
      .reduce((total, row) => total + row.total, 0);

  const stars = Object.values(trips)
    .filter((trip) => trip.driverId === driverId && trip.status === 'completed')
    .flatMap((trip) => (trip.rating ? [trip.rating.stars] : []));
  const average = stars.length
    ? Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10
    : undefined;

  return {
    today: sum(dayStart),
    thisWeek: sum(weekStart),
    allTime: rows.reduce((total, row) => total + row.total, 0),
    deliveries: rows.length,
    ratingCount: stars.length,
    averageRating: average,
  };
}