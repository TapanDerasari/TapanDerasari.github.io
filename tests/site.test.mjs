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
  assert.deepEqual(srcs, ['js/main.js', 'js/hero-orbits.js'], `unexpected scripts: ${srcs.join(', ')}`);
  assert.match(html, /<script src="js\/main\.js" defer><\/script>/);
  assert.match(html, /<script src="js\/hero-orbits\.js" defer><\/script>/);
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

const AI_SKILLS = ['Claude Code', 'Amazon Bedrock + Guardrails', 'Amazon Transcribe', 'Amazon Polly'];

test('AI & Voice card lists the AI skills at intermediate, spanning the grid', () => {
  const html = read('index.html');
  const card = html.match(/<div class="skill-card skill-card--wide">[\s\S]*?AI &amp; Voice[\s\S]*?<!-- \/AI & Voice -->/);
  assert.ok(card, 'wide AI & Voice card missing');
  for (const name of AI_SKILLS) {
    const escaped = name.replace(/[+&]/g, (c) => (c === '&' ? '&amp;' : '\\+'));
    assert.match(card[0], new RegExp(`<span class="skill-item-name">${escaped}</span>\\s*<div class="skill-bar-wrap"><div class="skill-bar-fill" data-level="intermediate">`));
  }
  assert.match(read('css/style.css'), /\.skill-card--wide\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
});

test('AI skills are listed for search engines and LLMs', () => {
  const html = read('index.html');
  const knowsAbout = html.match(/"knowsAbout":\s*\[([\s\S]*?)\]/)[1];
  for (const name of ['Claude Code', 'Amazon Bedrock', 'Amazon Transcribe', 'Amazon Polly']) {
    assert.ok(knowsAbout.includes(`"${name}"`), `${name} missing from knowsAbout`);
    assert.ok(read('llms.txt').includes(name), `${name} missing from llms.txt`);
    assert.ok(read('llms-full.txt').includes(name), `${name} missing from llms-full.txt`);
  }
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
  'linkedin2', 'location3', 'monitor', 'phone3', 'sparkle', 'suitcase', 'twitter2', 'wrench'];

test('icons are inline SVG with a matching symbol for every use', () => {
  const html = read('index.html');
  assert.ok(!/<i class="icon-/.test(html), 'icon-font <i> elements remain');
  const symbols = [...html.matchAll(/<symbol id="icon-([a-z0-9-]+)"/g)].map(m => m[1]).sort();
  assert.deepEqual(symbols, [...ICONS].sort());
  const uses = [...html.matchAll(/<use href="#icon-([a-z0-9-]+)"\/>/g)].map(m => m[1]);
  assert.equal(uses.length, 23, `expected 23 icon uses, found ${uses.length}`);
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


// Review fix: style.css must state the values that actually render, not rules the
// Tailwind v3-compat block silently overrides.
test('style.css declares the line-height and element margins that actually apply', () => {
  const css = read('css/style.css');
  const rule = (sel) => (css.match(new RegExp(`(?:^|\\n)${sel}\\s*\\{([^}]*)\\}`)) || [])[1] || '';
  assert.match(rule('body'), /line-height:\s*1\.5;/, 'body line-height should be 1.5 (what renders)');
  assert.ok(!/margin/.test(rule('p')), 'p { margin } is overridden by the v3 reset; remove it');
  assert.ok(!/margin/.test(rule('h1, h2, h3, h4, h5, h6, figure')), 'heading margins are overridden; remove them');
  assert.ok(!read('src/tailwind.css').includes('body { line-height: inherit; }'), 'compat body line-height no longer needed');
});

test('the portfolio photo is self-hosted everywhere, not the GitHub avatar', () => {
  const html = read('index.html');
  assert.ok(!html.includes('avatars.githubusercontent.com'), 'GitHub avatar still referenced');
  for (const f of ['images/tapan-derasari-avatar.webp', 'images/tapan-derasari-avatar.jpg', 'images/tapan-derasari-og.jpg']) {
    assert.ok(exists(f), `${f} missing`);
  }
  const og = 'https://tapanderasari.github.io/images/tapan-derasari-og.jpg';
  assert.match(html, new RegExp(`<meta property="og:image" content="${og}"/>`));
  assert.match(html, new RegExp(`<meta name="twitter:image" content="${og}"/>`));
  assert.match(html, new RegExp(`"image": "${og}"`));
  assert.match(html, /<picture>\s*<source srcset="images\/tapan-derasari-avatar\.webp" type="image\/webp">\s*<img src="images\/tapan-derasari-avatar\.jpg" alt="Tapan Derasari" class="hero-avatar-img" width="440" height="440" fetchpriority="high" decoding="async">\s*<\/picture>/);
  assert.ok(read('.gitignore').includes('images/Tapan-Derasari-Photo.jpg'), 'keep the 1.8 MB original out of the repo');
});

test('hero composition sits in an orbit-system wrapper', () => {
  const html = read('index.html');
  const visual = html.split('<div class="hero-visual">')[1].split('<!-- Scroll indicator -->')[0];
  assert.match(visual, /^\s*<div class="orbit-system">/, 'orbit-system must wrap the hero-visual contents');
  assert.ok(visual.indexOf('hero-avatar-wrap') > visual.indexOf('orbit-system'));
  assert.equal((visual.match(/class="hero-badge /g) || []).length, 8, 'eight skill pills inside the orbit system');
});

test('each hero pill has its own static position for the no-JS layout', () => {
  const html = read('index.html');
  const css = read('css/style.css');
  const mods = [...html.matchAll(/class="hero-badge hero-badge--(\d+)"/g)].map(m => m[1]);
  assert.equal(new Set(mods).size, mods.length, `pills share a position class: ${mods.join(', ')}`);
  for (const n of mods) assert.match(css, new RegExp(`\\.hero-badge--${n}\\s*\\{[^}]*(top|bottom):`), `no position for .hero-badge--${n}`);
});

test('pills sharing an orbit are spread evenly, however many there are', () => {
  const js = read('js/hero-orbits.js');
  assert.ok(!/i < 3 \? 0 : Math\.PI/.test(js), 'phase assumes exactly two pills per orbit');
});

test('orbit layout only applies once the script opts in, so pills stay placed without JS', () => {
  const css = read('css/style.css');
  assert.match(css, /\.orbit-system\s*\{[^}]*position:\s*absolute/);
  assert.match(css, /\.orbits-on \.hero-badge\s*\{[^}]*animation:\s*none/);
  assert.ok(!/(^|\n)\.hero-badge\s*\{[^}]*top:\s*50%/.test(css), 'unscoped pill centring would break the no-JS layout');
});

test('hero-orbits.js is dependency-free and respects motion, pointer and visibility', () => {
  const js = read('js/hero-orbits.js');
  assert.ok(!/\$\(|jQuery|import /.test(js), 'no libraries');
  assert.ok(js.includes("matchMedia('(prefers-reduced-motion: reduce)')"), 'reduced motion');
  assert.ok(js.includes("matchMedia('(pointer: fine)')"), 'parallax only with a mouse');
  assert.ok(js.includes('IntersectionObserver') && js.includes('visibilitychange'), 'pauses when hidden');
  assert.ok(js.includes("classList.add('orbits-on')"), 'opts in to the orbit CSS');
  assert.ok(js.includes("setAttribute('aria-hidden', 'true')"), 'particle canvas hidden from assistive tech');
});

test('template leftovers are not published', () => {
  for (const f of ['assets', 'forms', 'sass', 'inner-page.html', 'portfolio-details.html',
    'css/bootstrap.css', 'css/bootstrap.css.map', 'css/animate.css', 'css/flexslider.css', 'css/style.css.map',
    'images/blog-1.jpg', 'images/blog-2.jpg', 'images/cover_bg_1.jpg', 'images/cover_bg_3.jpg',
    'images/loader.gif', 'images/loc.png', 'images/user-3.jpg', 'images/apple-touch-icon.svg',
    ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => `images/portfolio-${n}.jpg`),
    'css/.DS_Store', 'fonts', 'images/.DS_Store', 'js/.DS_Store']) {
    assert.ok(!exists(f), `${f} should be removed`);
  }
  assert.ok(!read('css/style.css').includes('sourceMappingURL'), 'stale source map comment');
});

test('every local file index.html references exists', () => {
  const html = read('index.html');
  const refs = [...html.matchAll(/(?:href|src|srcset)="(?!https?:|#|mailto:|tel:)([^"?#]+)/g)].map(m => m[1]);
  assert.ok(refs.length >= 8, 'expected local asset references');
  for (const r of refs) assert.ok(exists(r), `missing: ${r}`);
});
