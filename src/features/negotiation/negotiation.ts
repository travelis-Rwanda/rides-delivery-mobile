export type Party = 'driver' | 'customer';
export type OfferStatus = 'pending' | 'accepted' | 'countered' | 'declined' | 'expired';

export type Offer = {
  id: string;
  driverId: string; // which driver's thread this offer belongs to
  by: Party;        // who made this offer
  amount: number;   // driver transport fare only, in RWF
  createdAt: string;
  status: OfferStatus;
  // Set when the customer's price was passed on from a driver who passed on
  // the job. Holds that driver's id.
  carriedFrom?: string;
};

// Which driver the customer is negotiating with, and who comes next.
export type Assignment = {
  order: string[]; // every eligible driver, best first
  basis: 'nearest' | 'cheapest';
  fellBack: boolean; // urgent, but the pickup was not pinned
  current?: string; // undefined once every driver has been tried
  tried: string[]; // drivers who did not reach a deal, in order
};

export type Negotiation = {
  requestId: string;
  minimumFare: number;
  maxRoundsPerDriver: number;
  status: 'open' | 'locked';
  tripKey?: string; // identifies the trip these offers were made for
  assignment?: Assignment;
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

// Once a driver's chat reaches the round limit, the last offer is the final
// one, and whoever it was sent to has this long to accept it.
export const FINAL_OFFER_WINDOW_MS = 20_000;

// When the final offer in the current driver's chat runs out, as a timestamp in
// milliseconds, or undefined while there is no final offer waiting.
export function finalOfferDeadline(
  n: Negotiation,
  windowMs: number = FINAL_OFFER_WINDOW_MS,
): number | undefined {
  const current = n.assignment?.current;
  if (current === undefined || n.status === 'locked') return undefined;
  const thread = threadOf(n, current);
  const last = thread[thread.length - 1];
  if (!last || last.status !== 'pending') return undefined;
  if (thread.length < n.maxRoundsPerDriver) return undefined;
  const sentAt = Date.parse(last.createdAt);
  return Number.isFinite(sentAt) ? sentAt + windowMs : undefined;
}

export function threadOf(n: Negotiation, driverId: string) {
  return n.offers.filter((offer) => offer.driverId === driverId);
}

// Submit a new offer or a counter-offer.
export function submitOffer(
  n: Negotiation,
  input: {
    id: string;
    driverId: string;
    by: Party;
    amount: number;
    now: string;
    carriedFrom?: string;
  },
): Result {
  if (n.status === 'locked') return fail('The fare is already locked.');
  if (!Number.isSafeInteger(input.amount))
    return fail('Enter a whole amount in RWF.');
  if (input.amount < n.minimumFare)
    return fail(`The fare cannot be below the minimum of RWF ${n.minimumFare}.`);
  if (n.assignment && n.assignment.current !== input.driverId)
    return fail('This driver is not assigned to your delivery.');

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
    ...(input.carriedFrom ? { carriedFrom: input.carriedFrom } : {}),
  });
  return ok({ ...n, offers });
}

function findPending(n: Negotiation, offerId: string, responder: Party) {
  if (n.status === 'locked') return fail('The fare is already locked.');
  const offer = n.offers.find((entry) => entry.id === offerId);
  if (!offer) return fail('This offer does not exist.');
  if (n.assignment && offer.driverId !== n.assignment.current)
    return fail('This driver is not assigned to your delivery.');
  if (offer.status !== 'pending') return fail('This offer is no longer open.');
  if (offer.by === responder)
    return fail('You cannot respond to your own offer.');
  return offer;
}

// The other side accepts: the fare locks at this exact amount.
// Pass the current time (in milliseconds) to refuse an offer whose final-answer
// window has already run out.
export function acceptOffer(
  n: Negotiation,
  offerId: string,
  responder: Party,
  nowMs?: number,
): Result {
  const offer = findPending(n, offerId, responder);
  if ('ok' in offer) return offer;
  const deadline = finalOfferDeadline(n);
  if (nowMs !== undefined && deadline !== undefined && nowMs >= deadline)
    return fail('Time ran out on this offer.');
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
    ['pending', 'accepted', 'countered', 'declined', 'expired'].includes(o.status as string) &&
    (o.carriedFrom === undefined || (typeof o.carriedFrom === 'string' && !!o.carriedFrom))
  );
};

const isAssignment = (v: unknown): v is Assignment => {
  if (!v || typeof v !== 'object') return false;
  const a = v as Record<string, unknown>;
  const ids = (x: unknown): x is string[] =>
    Array.isArray(x) && x.every((id) => typeof id === 'string' && !!id);
  return (
    ids(a.order) &&
    ids(a.tried) &&
    (a.basis === 'nearest' || a.basis === 'cheapest') &&
    typeof a.fellBack === 'boolean' &&
    (a.current === undefined ||
      (typeof a.current === 'string' &&
        a.order.includes(a.current) &&
        !a.tried.includes(a.current)))
  );
};

// Used when reading saved data back, like isDeliveryRequest does for requests.
export function isNegotiation(value: unknown): value is Negotiation {
  if (!value || typeof value !== 'object') return false;
  const n = value as Record<string, unknown>;
  const locked = n.status === 'locked';
  const assignment = n.assignment as Assignment | undefined;
  return (
    typeof n.requestId === 'string' && !!n.requestId &&
    typeof n.minimumFare === 'number' && Number.isSafeInteger(n.minimumFare) && n.minimumFare > 0 &&
    typeof n.maxRoundsPerDriver === 'number' && Number.isSafeInteger(n.maxRoundsPerDriver) && n.maxRoundsPerDriver > 0 &&
    (n.tripKey === undefined || typeof n.tripKey === 'string') &&
    (n.assignment === undefined || isAssignment(n.assignment)) &&
    (n.status === 'open' || locked) &&
    Array.isArray(n.offers) && n.offers.every(isOffer) &&
    (locked
      ? typeof n.lockedFare === 'number' &&
        typeof n.lockedOfferId === 'string' &&
        (n.offers as Offer[]).some(
          (o) =>
            o.id === n.lockedOfferId &&
            o.status === 'accepted' &&
            o.amount === n.lockedFare &&
            // The deal must be with the driver the customer was matched to.
          (assignment === undefined || o.driverId === assignment.current),
        )
      : n.lockedFare === undefined && n.lockedOfferId === undefined)
  );
}