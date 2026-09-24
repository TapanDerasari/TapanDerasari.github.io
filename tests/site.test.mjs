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

test('site is dark-only: no toggle, no theme scripts', () => {
  const html = read('index.html');
  assert.ok(!html.includes('darkModeToggle'), 'toggle button still present');
  assert.ok(!html.includes('localStorage'), 'theme persistence script still present');
  assert.ok(!html.includes('dark-mode'), 'dark-mode class still referenced');
  assert.match(html, /<meta name="color-scheme" content="dark">/);
  assert.match(html, /<meta name="theme-color" content="#18191E">/);
  assert.ok(!html.includes('rgba(0,0,0,0.08)'), 'dark-on-dark border still present');
});

test('style.css has dark values as the only theme', () => {
  const css = read('css/style.css');
  assert.ok(!css.includes('dark-mode'), 'body.dark-mode rules still present');
  assert.match(css, /--accent:\s*#E8854A;/);
  assert.match(css, /--text-primary:\s*#F3F4F6;/);
  assert.ok(css.includes('linear-gradient(135deg, #18191E 0%, #22242C 100%)'));
  assert.ok(!/^\*\s*\{\s*transition/m.test(css), 'global * transition still present');
});
