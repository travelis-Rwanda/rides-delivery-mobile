import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createPressIntent,
  type ScrollActivity,
} from '../src/components/ui/pressIntent';

function scrollActivity(): ScrollActivity {
  return { version: 0, dragging: false, momentum: false };
}

test('a deliberate tap tolerates small finger jitter', () => {
  const intent = createPressIntent();
  intent.start({ pageX: 100, pageY: 200 });
  intent.move({ pageX: 103, pageY: 204 });
  assert.equal(intent.canActivate(), true);
});

test('dragging inside a large card cancels even if the finger returns', () => {
  for (const point of [
    { pageX: 100, pageY: 212 },
    { pageX: 112, pageY: 200 },
    { pageX: 108, pageY: 208 },
  ]) {
    const intent = createPressIntent();
    intent.start({ pageX: 100, pageY: 200 });
    intent.move(point);
    intent.move({ pageX: 100, pageY: 200 });
    assert.equal(intent.canActivate(), false);
  }
});

test('a scroll that starts and stops during the gesture still cancels the tap', () => {
  const scroll = scrollActivity();
  const intent = createPressIntent();
  intent.start({ pageX: 100, pageY: 200 }, scroll);
  scroll.version += 1;
  assert.equal(intent.canActivate(scroll), false);
});

test('touching to stop momentum never opens a card', () => {
  const scroll = { ...scrollActivity(), momentum: true };
  const intent = createPressIntent();
  intent.start({ pageX: 100, pageY: 200 }, scroll);
  scroll.momentum = false;
  assert.equal(intent.canActivate(scroll), false);
});

test('a cancelled touch does not block the next tap or keyboard activation', () => {
  const intent = createPressIntent();
  intent.start({ pageX: 100, pageY: 200 });
  intent.cancel();
  assert.equal(intent.canActivate(), false);
  intent.reset();
  assert.equal(intent.canActivate(), true);
  intent.start({ pageX: 100, pageY: 200 });
  assert.equal(intent.canActivate(), true);
});
