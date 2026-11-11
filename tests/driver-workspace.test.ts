/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  jobStatus,
  jobsForDriver,
} from '../src/features/driver-workspace/jobs';
import { declineAndAdvance } from '../src/features/negotiation/assignment';
import { bubbleLabel, statusCaption } from '../src/features/negotiation/chat';
import { openWithMockOffers } from '../src/features/negotiation/mockDrivers';
import {
  acceptOffer,
  offerId,
  submitOffer,
  type Negotiation,
  type Result,
} from '../src/features/negotiation/negotiation';
import type { Job } from '../src/features/negotiation/selection';

const NOW = '2026-11-11T10:00:00.000Z';
const standard: Job = { service: 'parcel', size: 'Small', urgent: false };

function must(result: Result): Negotiation {
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.negotiation;
}

const open = (requestId = 'r1', now = NOW) =>
  openWithMockOffers(requestId, 3000, now, 'trip', standard);

const customerCounters = (n: Negotiation, driverId: string, amount: number) =>
  must(
    submitOffer(n, {
      id: offerId(n, driverId),
      driverId,
      by: 'customer',
      amount,
      now: NOW,
    }),
  );

test('a new job waits on the matched driver, and other drivers do not see it', () => {
  const n = open();
  assert.equal(jobStatus(n, 'driver-1'), 'waiting'); // matched, their offer is out
  assert.equal(jobStatus(n, 'driver-2'), undefined); // standby, not shown
  assert.equal(jobStatus(n, 'driver-3'), undefined);
});

test('a customer counter makes it the driver’s turn', () => {
  const n = customerCounters(open(), 'driver-1', 3100);
  assert.equal(jobStatus(n, 'driver-1'), 'your-turn');
});

test('a driver who passes sees the job as passed, and the next driver gets it', () => {
  let n = customerCounters(open(), 'driver-1', 3100);
  const counter = n.offers.find((o) => o.id === 'r1:driver-1:2')!;
  n = must(declineAndAdvance(n, counter.id, 'driver'));
  assert.equal(jobStatus(n, 'driver-1'), 'passed');
  assert.equal(jobStatus(n, 'driver-2'), 'waiting');
});

test('an agreed fare shows as agreed for the winner and passed for earlier drivers', () => {
  let n = open();
  const first = n.offers.find((o) => o.driverId === 'driver-1')!;
  n = must(declineAndAdvance(n, first.id, 'customer'));
  const second = n.offers.find((o) => o.driverId === 'driver-2')!;
  n = must(acceptOffer(n, second.id, 'customer'));
  assert.equal(jobStatus(n, 'driver-2'), 'agreed');
  assert.equal(jobStatus(n, 'driver-1'), 'passed');
  assert.equal(jobStatus(n, 'driver-3'), undefined);
});

test('negotiations from before drivers were matched belong to nobody', () => {
  const legacy = openWithMockOffers('r1', 3000, NOW, 'trip');
  assert.equal(jobStatus(legacy, 'driver-1'), undefined);
});

test('jobs list the driver’s turn first, then newest first', () => {
  const waitingOld = open('old', '2026-11-11T08:00:00.000Z');
  const waitingNew = open('new', '2026-11-11T09:00:00.000Z');
  const turn = customerCounters(open('turn', '2026-11-11T07:00:00.000Z'), 'driver-1', 3100);
  const jobs = jobsForDriver(
    { old: waitingOld, new: waitingNew, turn },
    'driver-1',
  );
  assert.deepEqual(
    jobs.map((job) => job.requestId),
    ['turn', 'new', 'old'],
  );
  assert.deepEqual(
    jobs.map((job) => job.status),
    ['your-turn', 'waiting', 'waiting'],
  );
  assert.deepEqual(jobsForDriver({ old: waitingOld }, 'driver-2'), []);
});

test('the chat words each message from the viewer’s side', () => {
  const n = customerCounters(open(), 'driver-1', 3100);
  const [ask, counter] = n.offers.filter((o) => o.driverId === 'driver-1');

  assert.equal(bubbleLabel(ask, 0, 'customer'), 'Driver’s offer');
  assert.equal(bubbleLabel(counter, 1, 'customer'), 'Your counter-offer');
  assert.equal(bubbleLabel(ask, 0, 'driver'), 'Your offer');
  assert.equal(bubbleLabel(counter, 1, 'driver'), 'Customer’s counter-offer');

  assert.equal(statusCaption(counter, 'customer'), 'Waiting for reply');
  assert.equal(statusCaption(counter, 'driver'), 'Open offer');
  assert.equal(statusCaption(ask, 'driver'), '');
});