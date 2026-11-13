/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { jobStatus } from '../src/features/driver-workspace/jobs';
import {
  declineAndAdvance,
  driverFailed,
  expireAll,
  expireFinalOffer,
} from '../src/features/negotiation/assignment';
import {
  finalOfferNotice,
  statusCaption,
} from '../src/features/negotiation/chat';
import { openWithMockOffers } from '../src/features/negotiation/mockDrivers';
import {
  FINAL_OFFER_WINDOW_MS,
  acceptOffer,
  finalOfferDeadline,
  isNegotiation,
  offerId,
  submitOffer,
  threadOf,
  type Negotiation,
  type Party,
  type Result,
} from '../src/features/negotiation/negotiation';
import type { Job } from '../src/features/negotiation/selection';

const START = Date.parse('2026-11-11T10:00:00.000Z');
const at = (seconds: number) => new Date(START + seconds * 1000).toISOString();
const ms = (seconds: number) => START + seconds * 1000;
const standard: Job = { service: 'parcel', size: 'Small', urgent: false };

function must(result: Result): Negotiation {
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.negotiation;
}

const open = () => openWithMockOffers('r1', 3000, at(0), 'trip', standard);

const say = (
  n: Negotiation,
  by: Party,
  amount: number,
  seconds: number,
  driverId = 'driver-1',
) =>
  must(
    submitOffer(n, {
      id: offerId(n, driverId),
      driverId,
      by,
      amount,
      now: at(seconds),
    }),
  );

const lastOf = (n: Negotiation, driverId: string) =>
  threadOf(n, driverId).at(-1)!;

// Eric's chat, four messages long, which is the limit: his offer, then the
// customer, Eric and the customer again. The customer's 3,150 is the final
// offer, sent at 30 seconds, so Eric has until 50 seconds.
function atTheLimit() {
  let n = open();
  n = say(n, 'customer', 3100, 10);
  n = say(n, 'driver', 3250, 20);
  return say(n, 'customer', 3150, 30);
}

test('the window is twenty seconds', () => {
  assert.equal(FINAL_OFFER_WINDOW_MS, 20_000);
});

test('there is no clock before the round limit', () => {
  let n = open();
  assert.equal(finalOfferDeadline(n), undefined);
  n = say(n, 'customer', 3100, 10);
  n = say(n, 'driver', 3250, 20);
  assert.equal(threadOf(n, 'driver-1').length, 3);
  assert.equal(finalOfferDeadline(n), undefined);
});

test('after the fourth message the last offer has twenty seconds', () => {
  const n = atTheLimit();
  assert.equal(threadOf(n, 'driver-1').length, 4);
  assert.equal(finalOfferDeadline(n), ms(30) + 20_000);
  assert.equal(finalOfferDeadline(n, 5_000), ms(30) + 5_000);
});

test('no clock runs once the fare is locked or nobody is matched', () => {
  const n = atTheLimit();
  const locked = must(acceptOffer(n, lastOf(n, 'driver-1').id, 'driver'));
  assert.equal(finalOfferDeadline(locked), undefined);

  assert.equal(finalOfferDeadline({ ...n, assignment: undefined }), undefined);
  assert.equal(
    finalOfferDeadline({
      ...n,
      assignment: { ...n.assignment!, current: undefined },
    }),
    undefined,
  );
  // An offer that is already answered has no clock either.
  const answered = must(
    declineAndAdvance(n, lastOf(n, 'driver-1').id, 'driver', at(35)),
  );
  assert.equal(finalOfferDeadline(answered) === undefined, true);
});

test('nothing happens until the twenty seconds are up', () => {
  const n = atTheLimit();
  assert.equal(expireFinalOffer(n, ms(30)), n);
  assert.equal(expireFinalOffer(n, ms(49)), n);
  assert.equal(expireFinalOffer(n, ms(50) - 1), n);
});

test('when time runs out the delivery moves to the next driver with the customer’s price', () => {
  const n = expireFinalOffer(atTheLimit(), ms(50));

  const eric = threadOf(n, 'driver-1');
  assert.equal(eric.at(-1)!.status, 'expired');
  assert.equal(eric.length, 4);

  assert.equal(n.assignment?.current, 'driver-2');
  assert.deepEqual(n.assignment?.tried, ['driver-1']);
  // The customer's last price, 3,150, goes to Aline as an open offer.
  const carried = lastOf(n, 'driver-2');
  assert.equal(carried.by, 'customer');
  assert.equal(carried.amount, 3150);
  assert.equal(carried.carriedFrom, 'driver-1');
  assert.equal(carried.createdAt, at(50));
  assert.equal(jobStatus(n, 'driver-2'), 'your-turn');
  assert.equal(jobStatus(n, 'driver-1'), 'passed');
  assert.ok(isNegotiation(n));
});

test('a late check still moves on, for example after the app was closed', () => {
  const n = expireFinalOffer(atTheLimit(), ms(3600));
  assert.equal(n.assignment?.current, 'driver-2');
  assert.equal(lastOf(n, 'driver-2').createdAt, at(3600));
});

test('accepting just in time works, and accepting too late is refused', () => {
  const n = atTheLimit();
  const final = lastOf(n, 'driver-1');

  const inTime = must(acceptOffer(n, final.id, 'driver', ms(49)));
  assert.equal(inTime.lockedFare, 3150);

  const late = acceptOffer(n, final.id, 'driver', ms(50));
  assert.equal(late.ok, false);
  assert.equal(late.ok ? '' : late.error, 'Time ran out on this offer.');

  // Without a time the rule is unchanged: the sweeper handles expiry.
  assert.ok(acceptOffer(n, final.id, 'driver').ok);
});

test('an offer that is not the final one never expires', () => {
  const n = say(open(), 'customer', 3100, 10);
  assert.equal(
    acceptOffer(n, lastOf(n, 'driver-1').id, 'driver', ms(9999)).ok,
    true,
  );
  assert.equal(expireFinalOffer(n, ms(9999)), n);
});

test('it works the same way when the driver made the final offer', () => {
  // With three rounds, the third message is the driver's, so the customer has
  // twenty seconds to accept it.
  let n = { ...open(), maxRoundsPerDriver: 3 };
  n = say(n, 'customer', 3100, 10);
  n = say(n, 'driver', 3250, 20);
  assert.equal(finalOfferDeadline(n), ms(40));

  const moved = expireFinalOffer(n, ms(40));
  assert.equal(moved.assignment?.current, 'driver-2');
  // The customer's own last price, 3,100, is what goes on, not Eric's 3,250.
  assert.equal(lastOf(moved, 'driver-2').amount, 3100);
});

test('the price passed on counts as a round, so the limit comes sooner', () => {
  let n = say(open(), 'customer', 3100, 10);
  n = must(declineAndAdvance(n, lastOf(n, 'driver-1').id, 'driver', at(15)));
  // Aline's chat already has two messages: her offer and the customer's.
  assert.equal(threadOf(n, 'driver-2').length, 2);
  n = say(n, 'driver', 3400, 20, 'driver-2');
  assert.equal(finalOfferDeadline(n), undefined);
  n = say(n, 'customer', 3200, 25, 'driver-2');
  assert.equal(threadOf(n, 'driver-2').length, 4);
  assert.equal(finalOfferDeadline(n), ms(45));
});

test('when the last driver runs out of time nobody is left, and nothing breaks', () => {
  let n = atTheLimit();
  n = expireFinalOffer(n, ms(50)); // Eric out, Aline holds the price
  n = must(declineAndAdvance(n, lastOf(n, 'driver-2').id, 'driver', at(60)));
  assert.equal(n.assignment?.current, 'driver-3');
  n = must(declineAndAdvance(n, lastOf(n, 'driver-3').id, 'driver', at(70)));
  assert.equal(n.assignment?.current, undefined);
  assert.equal(expireFinalOffer(n, ms(9999)), n);
  assert.ok(isNegotiation(n));
});

test('an offer that ran out of time counts as a driver who failed', () => {
  const n = atTheLimit();
  const moved = expireFinalOffer(n, ms(50));
  assert.equal(driverFailed(moved, 'driver-1'), true);
  assert.equal(driverFailed(moved, 'driver-2'), false);
});

test('every saved negotiation is checked, and only the expired ones change', () => {
  const stuck = atTheLimit();
  const fresh = say(
    openWithMockOffers('r2', 3000, at(0), 'trip', standard),
    'customer',
    3100,
    10,
  );
  const archive = { r1: stuck, r2: fresh };

  const nothing = expireAll(archive, ms(40));
  assert.equal(nothing, archive); // the very same object when nothing changed

  const after = expireAll(archive, ms(50));
  assert.notEqual(after, archive);
  assert.equal(after.r1.assignment?.current, 'driver-2');
  assert.equal(after.r2, fresh);
});

test('an expired offer survives storage and an unknown status is rejected', () => {
  const n = expireFinalOffer(atTheLimit(), ms(50));
  assert.ok(isNegotiation(JSON.parse(JSON.stringify(n))));
  const damaged = {
    ...n,
    offers: n.offers.map((o, i) => (i === 0 ? { ...o, status: 'timeout' } : o)),
  };
  assert.equal(isNegotiation(damaged), false);
});

test('the chat tells each side what the clock means', () => {
  const n = expireFinalOffer(atTheLimit(), ms(50));
  assert.equal(
    statusCaption(lastOf(n, 'driver-1'), 'customer'),
    'Time ran out',
  );
  assert.equal(statusCaption(lastOf(n, 'driver-1'), 'driver'), 'Time ran out');

  assert.equal(
    finalOfferNotice('driver', 'customer', 14, 'the customer'),
    'Final offer. Accept within 14 seconds, or it moves on to the next driver.',
  );
  assert.equal(
    finalOfferNotice('customer', 'customer', 1, 'Eric N.'),
    'Final offer sent. 1 second left for Eric N. to accept before the job moves on.',
  );
});