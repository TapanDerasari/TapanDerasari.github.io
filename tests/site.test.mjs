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

test('no jQuery or plugins are loaded; main.js is deferred', () => {
  const html = read('index.html');
  const srcs = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(srcs, ['js/main.js'], `unexpected scripts: ${srcs.join(', ')}`);
  assert.match(html, /<script src="js\/main\.js" defer><\/script>/);
  const inline = [...html.matchAll(/<script(?![^>]*(?:\bsrc=|type="application\/ld\+json"))[^>]*>/g)];
  assert.equal(inline.length, 0, 'inline scripts remain');
});

test('main.js is plain JavaScript', () => {
  const js = read('js/main.js');
  assert.ok(!/\$\(|jQuery/.test(js), 'jQuery usage remains');
  assert.ok(js.includes('IntersectionObserver'));
});

test('dead template animation hooks are gone', () => {
  assert.ok(!read('index.html').includes('animate-box'));
  assert.ok(!read('css/style.css').includes('animate-box'));
});

test('skill bar widths live in CSS so they show without JavaScript', () => {
  const css = read('css/style.css');
  for (const [level, width] of [['expert', '95%'], ['advanced', '75%'], ['intermediate', '55%'], ['beginner', '30%']]) {
    assert.match(css, new RegExp(`\\.skill-bar-fill\\[data-level="${level}"\\]\\s*\\{\\s*width:\\s*${width}`));
  }
  assert.ok(!/class="skill-bar-fill"[^>]*style=/.test(read('index.html')), 'inline width on a bar');
});

test('unused vendor scripts are deleted', () => {
  for (const f of ['jquery.min.js', 'jquery.easing.1.3.js', 'jquery.waypoints.min.js',
    'jquery.easypiechart.min.js', 'jquery.stellar.min.js', 'modernizr-2.6.2.min.js',
    'respond.min.js', 'bootstrap.min.js', 'google_map.js']) {
    assert.ok(!exists(`js/${f}`), `js/${f} still exists`);
  }
});

test('go-to-top is a real link with an accessible name', () => {
  assert.match(read('index.html'), /<a href="#page" class="js-gotop" aria-label="Back to top">/);
});

const ICONS = ['arrow-up22', 'cloud', 'database', 'envelop', 'github2', 'graduation-cap',
  'linkedin2', 'location3', 'monitor', 'phone3', 'suitcase', 'twitter2', 'wrench'];

test('icons are inline SVG with a matching symbol for every use', () => {
  const html = read('index.html');
  assert.ok(!/<i class="icon-/.test(html), 'icon-font <i> elements remain');
  const symbols = [...html.matchAll(/<symbol id="icon-([a-z0-9-]+)"/g)].map(m => m[1]).sort();
  assert.deepEqual(symbols, [...ICONS].sort());
  const uses = [...html.matchAll(/<use href="#icon-([a-z0-9-]+)"\/>/g)].map(m => m[1]);
  assert.equal(uses.length, 22, `expected 22 icon uses, found ${uses.length}`);
  for (const u of uses) assert.ok(ICONS.includes(u), `no symbol for icon-${u}`);
});

test('the icon font is gone', () => {
  assert.ok(!read('index.html').includes('icomoon'), 'icomoon still referenced in HTML');
  assert.ok(!read('css/style.css').includes('icomoon'), 'icomoon still referenced in CSS');
  assert.ok(!exists('css/icomoon.css'));
  assert.ok(!exists('fonts/icomoon'));
  assert.ok(!exists('fonts/bootstrap'));
});

test('icon CSS targets .icon, not <i>', () => {
  const css = read('css/style.css');
  assert.match(css, /\.icon\s*\{[^}]*fill:\s*currentColor/);
  assert.ok(!/(timeline-badge|contact-info li|gototop a) i\b/.test(css), 'selectors still target <i>');
});

test('head loads resources in the specified order', () => {
  const head = read('index.html').split('</head>')[0];
  const order = [
    'name="color-scheme"',
    'rel="icon"',
    'property="og:title"',
    'rel="preconnect" href="https://fonts.googleapis.com"',
    'rel="preconnect" href="https://fonts.gstatic.com" crossorigin',
    'href="https://fonts.googleapis.com/css2?',
    'href="css/style.css"',
    'href="css/tailwind.css"',
    'application/ld+json',
    'src="js/main.js" defer',
  ].map(s => [s, head.indexOf(s)]);
  for (const [s, i] of order) assert.ok(i !== -1, `missing in <head>: ${s}`);
  for (let k = 1; k < order.length; k++) {
    assert.ok(order[k - 1][1] < order[k][1], `${order[k - 1][0]} must come before ${order[k][0]}`);
  }
});

test('Google Fonts load once, from the <link>', () => {
  assert.ok(!read('css/style.css').includes('@import'), 'style.css still @imports fonts');
  assert.equal(read('index.html').split('fonts.googleapis.com/css2').length - 1, 1);
});

test('hero avatar reserves space and loads with high priority', () => {
  assert.match(read('index.html'),
    /<img src="https:\/\/avatars\.githubusercontent\.com\/u\/41634687" alt="Tapan Derasari" class="hero-avatar-img" width="460" height="460" fetchpriority="high" decoding="async">/);
});
