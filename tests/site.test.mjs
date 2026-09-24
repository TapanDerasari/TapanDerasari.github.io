// Static checks on the published files. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

test('Tailwind is compiled, not generated in the browser', () => {
  const html = read('index.html');
  assert.ok(!html.includes('cdn.tailwindcss.com'), 'CDN script still present');
  assert.ok(!html.includes('tailwind.config'), 'inline Tailwind config still present');
});

// The old CDN injected Tailwind after style.css, so Tailwind's base reset and
// utilities won equal-specificity ties. Loading the compiled file last keeps that.
test('compiled Tailwind loads after style.css, as the CDN did', () => {
  const html = read('index.html');
  const tw = html.indexOf('href="css/tailwind.css"');
  const custom = html.indexOf('href="css/style.css"');
  assert.ok(tw !== -1, 'css/tailwind.css is not linked');
  assert.ok(custom !== -1 && custom < tw, 'css/tailwind.css must come after css/style.css');
});

test('compiled CSS covers the utilities index.html uses, without plugins', () => {
  assert.ok(exists('css/tailwind.css'), 'css/tailwind.css missing; run npm run build');
  const css = read('css/tailwind.css');
  assert.ok(css.includes('.max-w-5xl'), 'missing .max-w-5xl');
  assert.ok(css.includes('.sm\\:inline'), 'missing .sm:inline');
  assert.ok(!css.includes('.prose'), 'typography plugin output found');
});
