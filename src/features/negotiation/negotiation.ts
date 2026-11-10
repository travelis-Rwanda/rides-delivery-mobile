export type Party = 'driver' | 'customer';
export type OfferStatus = 'pending' | 'accepted' | 'countered' | 'declined';

export type Offer = {
  id: string;
  driverId: string; // which driver's thread this offer belongs to
  by: Party;        // who made this offer
  amount: number;   // driver transport fare only, in RWF
  createdAt: string;
  status: OfferStatus;
};

export type Negotiation = {
  requestId: string;
  minimumFare: number;
  maxRoundsPerDriver: number;
  status: 'open' | 'locked';
  tripKey?: string; // identifies the trip these offers were made for
  offers: Offer[];
  lockedFare?: number;
  lockedOfferId?: string;
};

export type Result =
  | { ok: true; negotiation: Negotiation }
  | { ok: false; error: string };

const fail = (error: string): Result => ({ ok: false, error });
const ok = (negotiation: Negotiation): Result => ({ ok: true, negotiation });

export function startNegotiation(
  requestId: string,
  minimumFare: number,
  maxRoundsPerDriver = 4,
  tripKey?: string,
): Negotiation {
  return {
    requestId,
    minimumFare,
    maxRoundsPerDriver,
    status: 'open',
    offers: [],
    tripKey,
  };
}

export function threadOf(n: Negotiation, driverId: string) {
  return n.offers.filter((offer) => offer.driverId === driverId);
}

// Submit a new offer or a counter-offer.
export function submitOffer(
  n: Negotiation,
  input: { id: string; driverId: string; by: Party; amount: number; now: string },
): Result {
  if (n.status === 'locked') return fail('The fare is already locked.');
  if (!Number.isSafeInteger(input.amount))
    return fail('Enter a whole amount in RWF.');
  if (input.amount < n.minimumFare)
    return fail(`The fare cannot be below the minimum of RWF ${n.minimumFare}.`);

  const thread = threadOf(n, input.driverId);
  const last = thread[thread.length - 1];

  if (!last && input.by === 'customer')
    return fail('The customer can only counter an offer from a driver.');
  if (last && last.by === input.by)
    return fail('Wait for the other side to respond.');
  if (last && last.status !== 'pending')
    return fail('This offer is no longer open.');
  if (thread.length >= n.maxRoundsPerDriver)
    return fail('The negotiation limit was reached. Accept or decline the last offer.');

  const offers = n.offers.map((offer) =>
    offer === last ? { ...offer, status: 'countered' as const } : offer,
  );
  offers.push({
    id: input.id,
    driverId: input.driverId,
    by: input.by,
    amount: input.amount,
    createdAt: input.now,
    status: 'pending',
  });
  return ok({ ...n, offers });
}

function findPending(n: Negotiation, offerId: string, responder: Party) {
  if (n.status === 'locked') return fail('The fare is already locked.');
  const offer = n.offers.find((entry) => entry.id === offerId);
  if (!offer) return fail('This offer does not exist.');
  if (offer.status !== 'pending') return fail('This offer is no longer open.');
  if (offer.by === responder)
    return fail('You cannot respond to your own offer.');
  return offer;
}

// The other side accepts: the fare locks at this exact amount.
export function acceptOffer(n: Negotiation, offerId: string, responder: Party): Result {
  const offer = findPending(n, offerId, responder);
  if ('ok' in offer) return offer;
  return ok({
    ...n,
    status: 'locked',
    lockedFare: offer.amount,
    lockedOfferId: offer.id,
    offers: n.offers.map((entry) => {
      if (entry.id === offer.id) return { ...entry, status: 'accepted' as const };
      // Every other open offer, from any driver, is closed.
      return entry.status === 'pending' ? { ...entry, status: 'declined' as const } : entry;
    }),
  });
}

export function declineOffer(n: Negotiation, offerId: string, responder: Party): Result {
  const offer = findPending(n, offerId, responder);
  if ('ok' in offer) return offer;
  return ok({
    ...n,
    offers: n.offers.map((entry) =>
      entry.id === offer.id ? { ...entry, status: 'declined' as const } : entry,
    ),
  });
}

// A stable id for the next offer in a driver's thread.
export function offerId(n: Negotiation, driverId: string) {
  return `${n.requestId}:${driverId}:${threadOf(n, driverId).length + 1}`;
}

const isOffer = (v: unknown): v is Offer => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' && !!o.id &&
    typeof o.driverId === 'string' && !!o.driverId &&
    (o.by === 'driver' || o.by === 'customer') &&
    typeof o.amount === 'number' && Number.isSafeInteger(o.amount) && o.amount > 0 &&
    typeof o.createdAt === 'string' && Number.isFinite(Date.parse(o.createdAt)) &&
    ['pending', 'accepted', 'countered', 'declined'].includes(o.status as string)
  );
};

// Used when reading saved data back, like isDeliveryRequest does for requests.
export function isNegotiation(value: unknown): value is Negotiation {
  if (!value || typeof value !== 'object') return false;
  const n = value as Record<string, unknown>;
  const locked = n.status === 'locked';
  return (
    typeof n.requestId === 'string' && !!n.requestId &&
    typeof n.minimumFare === 'number' && Number.isSafeInteger(n.minimumFare) && n.minimumFare > 0 &&
    typeof n.maxRoundsPerDriver === 'number' && Number.isSafeInteger(n.maxRoundsPerDriver) && n.maxRoundsPerDriver > 0 &&
    (n.tripKey === undefined || typeof n.tripKey === 'string') &&
    (n.status === 'open' || locked) &&
    Array.isArray(n.offers) && n.offers.every(isOffer) &&
    (locked
      ? typeof n.lockedFare === 'number' &&
        typeof n.lockedOfferId === 'string' &&
        (n.offers as Offer[]).some(
          (o) => o.id === n.lockedOfferId && o.status === 'accepted' && o.amount === n.lockedFare,
        )
      : n.lockedFare === undefined && n.lockedOfferId === undefined)
  );
}