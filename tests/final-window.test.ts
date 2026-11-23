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
  messagesLeftNote,
  statusCaption,
} from '../src/features/negotiation/chat';
import { openWithMockOffers } from '../src/features/negotiation/mockDrivers';
import {
  FINAL_OFFER_WINDOW_MS,
  MAX_MESSAGES_PER_PARTY,
  acceptOffer,
  finalOfferDeadline,
  isNegotiation,
  messagesLeft,
  messagesSent,
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

// Eric has made his opening offer. The customer counters at 10 seconds, so Eric
// has until 30 seconds to reply.
const waitingOnEric = () => say(open(), 'customer', 3100, 10);

// Eric's chat at three messages each, the most allowed: his offer, then the
// customer, Eric, the customer, Eric, and the customer's third at 50 seconds.
function allSixSent() {
  let n = open();
  n = say(n, 'customer', 3100, 10);
  n = say(n, 'driver', 3400, 20);
  n = say(n, 'customer', 3200, 30);
  n = say(n, 'driver', 3300, 40);
  return say(n, 'customer', 3250, 50);
}

test('the window is twenty seconds', () => {
  assert.equal(FINAL_OFFER_WINDOW_MS, 20_000);
});

test('there is no clock while the customer is the one being waited on', () => {
  // Eric's opening offer waits for the customer, who is never timed.
  assert.equal(finalOfferDeadline(open()), undefined);
});

test('the clock runs on the driver from the customer’s message', () => {
  const n = waitingOnEric();
  assert.equal(finalOfferDeadline(n), ms(10) + 20_000);
  assert.equal(finalOfferDeadline(n, 5_000), ms(10) + 5_000);
});

test('once the driver has replied the clock stops', () => {
  const n = say(waitingOnEric(), 'driver', 3250, 20);
  assert.equal(finalOfferDeadline(n), undefined);
  assert.equal(expireFinalOffer(n, ms(9999)), n);
});

test('the driver’s third message has no clock, so the customer can take their time', () => {
  let n = open();
  n = say(n, 'customer', 3100, 10);
  n = say(n, 'driver', 3400, 20);
  n = say(n, 'customer', 3200, 30);
  n = say(n, 'driver', 3300, 40);
  assert.equal(messagesLeft(n, 'driver-1', 'driver'), 0);
  assert.equal(finalOfferDeadline(n), undefined);
  assert.equal(expireFinalOffer(n, ms(99999)), n);
  assert.equal(acceptOffer(n, lastOf(n, 'driver-1').id, 'customer', ms(99999)).ok, true);
});

test('the clock is the same on the customer’s first and last message', () => {
  assert.equal(finalOfferDeadline(allSixSent()), ms(50) + 20_000);
});

test('no clock runs once the fare is locked or nobody is matched', () => {
  const n = waitingOnEric();
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
  // A message that is already answered has no clock either.
  const answered = must(
    declineAndAdvance(n, lastOf(n, 'driver-1').id, 'driver', at(15)),
  );
  assert.equal(finalOfferDeadline(answered), ms(15) + 20_000); // Aline now holds the price
  assert.equal(threadOf(answered, 'driver-1').at(-1)!.status, 'declined');
});

test('nothing happens until the twenty seconds are up', () => {
  const n = waitingOnEric();
  assert.equal(expireFinalOffer(n, ms(10)), n);
  assert.equal(expireFinalOffer(n, ms(29)), n);
  assert.equal(expireFinalOffer(n, ms(30) - 1), n);
});

test('when the driver stays silent the job moves on with the customer’s price', () => {
  const n = expireFinalOffer(waitingOnEric(), ms(30));

  const eric = threadOf(n, 'driver-1');
  assert.equal(eric.at(-1)!.status, 'expired');
  assert.equal(eric.length, 2);

  assert.equal(n.assignment?.current, 'driver-2');
  assert.deepEqual(n.assignment?.tried, ['driver-1']);
  const carried = lastOf(n, 'driver-2');
  assert.equal(carried.by, 'customer');
  assert.equal(carried.amount, 3100);
  assert.equal(carried.carriedFrom, 'driver-1');
  assert.equal(carried.createdAt, at(30));
  assert.equal(jobStatus(n, 'driver-2'), 'your-turn');
  assert.equal(jobStatus(n, 'driver-1'), 'passed');
  assert.ok(isNegotiation(n));
});

test('the next driver gets their own twenty seconds', () => {
  const n = expireFinalOffer(waitingOnEric(), ms(30));
  assert.equal(finalOfferDeadline(n), ms(30) + 20_000);
});

test('a late check still moves on, for example after the app was closed', () => {
  const n = expireFinalOffer(waitingOnEric(), ms(3600));
  assert.equal(n.assignment?.current, 'driver-2');
  assert.equal(lastOf(n, 'driver-2').createdAt, at(3600));
});

test('replying just in time works, and replying too late is refused', () => {
  const n = waitingOnEric();
  const counter = lastOf(n, 'driver-1');

  const inTime = must(acceptOffer(n, counter.id, 'driver', ms(29)));
  assert.equal(inTime.lockedFare, 3100);

  const late = acceptOffer(n, counter.id, 'driver', ms(30));
  assert.equal(late.ok, false);
  assert.equal(late.ok ? '' : late.error, 'Time ran out on this offer.');

  // Without a time the rule is unchanged: the sweeper handles expiry.
  assert.ok(acceptOffer(n, counter.id, 'driver').ok);
});

test('the customer is never timed when accepting', () => {
  const n = open();
  const ask = lastOf(n, 'driver-1');
  assert.equal(acceptOffer(n, ask.id, 'customer', ms(99999)).ok, true);
});

test('when the last driver runs out of time nobody is left, and nothing breaks', () => {
  let n = waitingOnEric();
  n = expireFinalOffer(n, ms(30)); // Eric out, Aline holds the price
  n = expireFinalOffer(n, ms(50)); // Aline out, Jean Paul holds it
  assert.equal(n.assignment?.current, 'driver-3');
  n = expireFinalOffer(n, ms(70));
  assert.equal(n.assignment?.current, undefined);
  assert.equal(finalOfferDeadline(n), undefined);
  assert.equal(expireFinalOffer(n, ms(9999)), n);
  assert.ok(isNegotiation(n));
});

test('a message that ran out of time counts as a driver who failed', () => {
  const moved = expireFinalOffer(waitingOnEric(), ms(30));
  assert.equal(driverFailed(moved, 'driver-1'), true);
  assert.equal(driverFailed(moved, 'driver-2'), false);
});

test('every saved negotiation is checked, and only the silent ones change', () => {
  const stuck = waitingOnEric();
  const fresh = openWithMockOffers('r2', 3000, at(0), 'trip', standard);
  const archive = { r1: stuck, r2: fresh };

  const nothing = expireAll(archive, ms(20));
  assert.equal(nothing, archive); // the very same object when nothing changed

  const after = expireAll(archive, ms(30));
  assert.notEqual(after, archive);
  assert.equal(after.r1.assignment?.current, 'driver-2');
  assert.equal(after.r2, fresh);
});

test('an expired message survives storage and an unknown status is rejected', () => {
  const n = expireFinalOffer(waitingOnEric(), ms(30));
  assert.ok(isNegotiation(JSON.parse(JSON.stringify(n))));
  const damaged = {
    ...n,
    offers: n.offers.map((o, i) => (i === 0 ? { ...o, status: 'timeout' } : o)),
  };
  assert.equal(isNegotiation(damaged), false);
});

test('the chat tells each side what the clock means', () => {
  const n = expireFinalOffer(waitingOnEric(), ms(30));
  assert.equal(
    statusCaption(lastOf(n, 'driver-1'), 'customer'),
    'Time ran out',
  );
  assert.equal(statusCaption(lastOf(n, 'driver-1'), 'driver'), 'Time ran out');

  assert.equal(
    finalOfferNotice('driver', 'customer', 14, 'the customer'),
    'Reply within 14 seconds, or the job moves on to the next driver.',
  );
  assert.equal(
    finalOfferNotice('customer', 'customer', 1, 'Eric N.'),
    'Waiting for Eric N. to reply. 1 second left before the job moves on.',
  );
});

// ---- Three messages each ----

test('each side may send three messages', () => {
  assert.equal(MAX_MESSAGES_PER_PARTY, 3);
  const n = allSixSent();
  assert.equal(threadOf(n, 'driver-1').length, 6);
  assert.equal(messagesSent(n, 'driver-1', 'driver'), 3);
  assert.equal(messagesSent(n, 'driver-1', 'customer'), 3);
  assert.equal(messagesLeft(n, 'driver-1', 'driver'), 0);
  assert.equal(messagesLeft(n, 'driver-1', 'customer'), 0);
});

test('a fourth message from either side is refused', () => {
  const n = allSixSent();
  const tryDriver = submitOffer(n, {
    id: offerId(n, 'driver-1'),
    driverId: 'driver-1',
    by: 'driver',
    amount: 3280,
    now: at(55),
  });
  assert.equal(tryDriver.ok, false);
  assert.match(tryDriver.ok ? '' : tryDriver.error, /all 3 of your messages/);
});

test('the counts start from the driver’s opening offer', () => {
  const n = open();
  assert.equal(messagesSent(n, 'driver-1', 'driver'), 1);
  assert.equal(messagesLeft(n, 'driver-1', 'driver'), 2);
  assert.equal(messagesLeft(n, 'driver-1', 'customer'), 3);
});

test('a price passed on counts as the customer’s first message in the new chat', () => {
  const n = expireFinalOffer(waitingOnEric(), ms(30));
  assert.equal(messagesSent(n, 'driver-2', 'customer'), 1);
  assert.equal(messagesLeft(n, 'driver-2', 'customer'), 2);
  // Aline's own opening offer is her first message.
  assert.equal(messagesLeft(n, 'driver-2', 'driver'), 2);
});

test('at the limit the customer’s last message can be accepted but not countered', () => {
  const n = allSixSent();
  const last = lastOf(n, 'driver-1');
  assert.equal(last.by, 'customer');
  // The driver may accept it within the window...
  assert.equal(acceptOffer(n, last.id, 'driver', ms(60)).ok, true);
  // ...and if they stay silent it moves on like any other message.
  assert.equal(expireFinalOffer(n, ms(70)).assignment?.current, 'driver-2');
});

test('the messages-left note reads clearly', () => {
  assert.equal(
    messagesLeftNote(2),
    'You have 2 of 3 messages left in this chat.',
  );
  assert.equal(
    messagesLeftNote(0),
    'You have no messages left in this chat. Accept or decline the last offer.',
  );
});