import {
  tripStatusLabels,
  tripStatuses,
  type Trip,
  type TripStatus,
} from './trip';

export type TimelineStep = {
  status: TripStatus;
  label: string;
  at?: string; // when this step happened
  state: 'done' | 'current' | 'upcoming';
};

// Every step of the delivery, with what has happened and what is still to come.
// Once the delivery is completed every step is done.
export function timeline(trip: Trip): TimelineStep[] {
  const reached = tripStatuses.indexOf(trip.status);
  const finished = trip.status === 'completed';
  return tripStatuses.map((status, index) => ({
    status,
    label: tripStatusLabels[status],
    at: trip.history[index]?.at,
    state:
      index < reached || (finished && index === reached)
        ? 'done'
        : index === reached
          ? 'current'
          : 'upcoming',
  }));
}

// What the customer reads at the top of the tracking screen.
export function customerHeadline(trip: Trip, driverName: string) {
  switch (trip.status) {
    case 'booked':
      return {
        title: 'Driver booked',
        detail: `${driverName} will head to your pickup soon.`,
      };
    case 'on-the-way':
      return {
        title: 'Driver on the way',
        detail: `${driverName} is heading to pick up your parcel.`,
      };
    case 'in-transit':
      return {
        title: 'Parcel in transit',
        detail: `${driverName} has your parcel and is heading to the destination.`,
      };
    case 'delivered':
      return {
        title: 'Delivered',
        detail: `${driverName} says your parcel was delivered. Please confirm that it arrived.`,
      };
    case 'completed':
      return {
        title: 'Delivery completed',
        detail: 'Your parcel arrived. Thank you for using Rides.',
      };
  }
}

// Which buttons the customer can use right now.
export function customerActions(trip: Trip) {
  return {
    confirmPickup: trip.status === 'in-transit' && !trip.pickupConfirmedAt,
    confirmDelivery: trip.status === 'delivered',
  };
}

// The tip amounts offered with one tap, in whole RWF.
export const TIP_PRESETS: readonly number[] = [500, 1000, 2000];

// A tip typed by hand: whole francs only. Anything else gives undefined.
export function parseTipInput(text: string): number | undefined {
  const cleaned = text.replace(/[,\s]/g, '');
  return /^\d+$/.test(cleaned) ? Number(cleaned) : undefined;
}

// 4 -> ★★★★☆
export const starsText = (stars: number) =>
  '★'.repeat(stars) + '☆'.repeat(Math.max(0, 5 - stars));

export type DriverStep = {
  title: string;
  detail: string;
  // The button the driver presses to finish this step, if it is theirs.
  action?: string;
  // Which end of the trip the driver is heading for, for directions.
  stop?: 'pickup' | 'destination';
};

// What the driver sees and can do at each stage of the delivery.
export function driverStep(trip: Trip): DriverStep {
  switch (trip.status) {
    case 'booked':
      return {
        title: 'Customer has paid',
        detail: 'Head to the pickup address when you are ready.',
        action: 'Start driving to pickup',
        stop: 'pickup',
      };
    case 'on-the-way':
      return {
        title: 'Heading to pickup',
        detail: 'Collect the parcel from the sender, then confirm below.',
        action: 'Parcel picked up',
        stop: 'pickup',
      };
    case 'in-transit':
      return {
        title: 'Delivering the parcel',
        detail:
          'Take the parcel to the destination. When you hand it over, take a photo as proof.',
        action: 'Take delivery photo',
        stop: 'destination',
      };
    case 'delivered':
      return {
        title: 'Waiting for the customer',
        detail: 'The customer has been asked to confirm that the parcel arrived.',
      };
    case 'completed':
      return {
        title: 'Delivery completed',
        detail: 'The customer confirmed the delivery.',
      };
  }
}

// Whether a delivery still needs the driver or the customer to act.
export const isActiveTrip = (trip: Trip) => trip.status !== 'completed';


// When a delivery last moved, as a timestamp.
const lastMoved = (trip: Trip) =>
  Date.parse(trip.history[trip.history.length - 1].at);

// The customer's deliveries that are still on the move, most recent first.
export const activeTrips = (trips: Record<string, Trip>) =>
  Object.values(trips)
    .filter(isActiveTrip)
    .sort((a, b) => lastMoved(b) - lastMoved(a));

// The customer's completed deliveries, most recent first.
export const pastTrips = (trips: Record<string, Trip>) =>
  Object.values(trips)
    .filter((trip) => !isActiveTrip(trip))
    .sort((a, b) => lastMoved(b) - lastMoved(a));