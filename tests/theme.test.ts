/// <reference types="node" />

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

function themeFor(platform: 'web' | 'ios') {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        '-e',
        'console.log(JSON.stringify(require("./tailwind.config.js").theme.extend.colors))',
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, NATIVEWIND_OS: platform },
        encoding: 'utf8',
      },
    ),
  ) as Record<string, string>;
}

test('web theme emits valid CSS colors instead of native platform functions', () => {
  const theme = themeFor('web');
  for (const value of Object.values(theme)) {
    assert.ok(value.startsWith('rgb('));
    assert.ok(
      !value.includes('platformSelect') && !value.includes('platformColor'),
    );
  }
  assert.equal(theme.tint, theme.primary);
  assert.equal(theme.star, theme.primary);
});

test('native theme retains Apple system colors and independent brand green', () => {
  const theme = themeFor('ios');
  assert.ok(theme.primary.includes('platformColor(systemBlue)'));
  assert.ok(theme.warning.includes('platformColor(systemOrange)'));
  assert.ok(theme.destructive.includes('platformColor(systemRed)'));
  assert.ok(!theme.success.includes('platformColor'));
  assert.ok(theme['success-muted'].includes('var(--alpha-success-muted)'));
});
