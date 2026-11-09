import assert from 'node:assert/strict';
import { test } from 'node:test';

import { inputScrollAdjustment } from '../src/components/ui/keyboardGeometry';

test('keeps a visible input in place', () => {
  assert.equal(
    inputScrollAdjustment({ top: 80, height: 300 }, { top: 120, height: 56 }),
    0,
  );
});

test('brings notes above the footer after the keyboard shrinks the viewport', () => {
  const input = { top: 290, height: 96 };
  assert.equal(inputScrollAdjustment({ top: 80, height: 600 }, input), 0);
  const viewport = { top: 80, height: 260 };
  const adjustment = inputScrollAdjustment(viewport, input);
  assert.equal(adjustment, 58);
  const movedInput = { ...input, top: input.top - adjustment };
  assert.equal(movedInput.top + movedInput.height, 328);
  assert.equal(inputScrollAdjustment(viewport, movedInput), 0);
});

test('reveals a previous field above the scroll viewport', () => {
  assert.equal(
    inputScrollAdjustment({ top: 80, height: 260 }, { top: 40, height: 56 }),
    -52,
  );
});

test('aligns an oversized multiline field at the top without oscillating', () => {
  const viewport = { top: 80, height: 100 };
  const input = { top: 160, height: 120 };
  const adjustment = inputScrollAdjustment(viewport, input);
  assert.equal(adjustment, 68);
  assert.equal(
    inputScrollAdjustment(viewport, { ...input, top: input.top - adjustment }),
    0,
  );
});
