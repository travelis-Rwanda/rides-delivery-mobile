import {
  threadOf,
  type Negotiation,
  type Offer,
} from '../negotiation/negotiation';

export type JobStatus = 'your-turn' | 'waiting' | 'agreed' | 'passed';

export type DriverJob = {
  requestId: string;
  status: JobStatus;
  negotiation: Negotiation;
  lastOffer: Offer; // the latest price in this driver's chat
};

// Where this job stands for one driver, or undefined if it is not theirs.
export function jobStatus(
  n: Negotiation,
  driverId: string,
): JobStatus | undefined {
  const assignment = n.assignment;
  if (n.status === 'locked') {
    const deal = n.offers.find((offer) => offer.id === n.lockedOfferId);
    if (deal?.driverId === driverId) return 'agreed';
    return assignment?.tried.includes(driverId) ? 'passed' : undefined;
  }
  if (!assignment) return undefined;
  if (assignment.current === driverId) {
    const last = threadOf(n, driverId).at(-1);
    if (!last) return undefined;
    return last.by === 'customer' && last.status === 'pending'
      ? 'your-turn'
      : 'waiting';
  }
  return assignment.tried.includes(driverId) ? 'passed' : undefined;
}

// Who may see the customer's contact details. The driver in play and the
// driver with the agreed fare can; a driver who passed cannot. Keeping the rule
// in one place makes it easy to tighten, for example to show phone numbers
// only once the fare is agreed.
export function contactsVisible(status: JobStatus): boolean {
  return status !== 'passed';
}

const rank: Record<JobStatus, number> = {
  'your-turn': 0,
  waiting: 1,
  agreed: 2,
  passed: 3,
};

// Every job that belongs to this driver: ones that need them first, then
// the rest, newest first within each group.
export function jobsForDriver(
  negotiations: Readonly<Record<string, Negotiation>>,
  driverId: string,
): DriverJob[] {
  const jobs: DriverJob[] = [];
  for (const negotiation of Object.values(negotiations)) {
    const status = jobStatus(negotiation, driverId);
    const lastOffer = threadOf(negotiation, driverId).at(-1);
    if (status && lastOffer)
      jobs.push({
        requestId: negotiation.requestId,
        status,
        negotiation,
        lastOffer,
      });
  }
  return jobs.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      b.lastOffer.createdAt.localeCompare(a.lastOffer.createdAt) ||
      a.requestId.localeCompare(b.requestId),
  );
}