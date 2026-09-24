# Performance Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Tailwind CDN, jQuery stack and icon font on `index.html` with a compiled Tailwind v4 stylesheet, about 40 lines of plain JavaScript and an inline SVG sprite, and make the site dark-only, without visible regressions.

**Architecture:** Static single page on GitHub Pages, with no server build. Tailwind is compiled locally by `@tailwindcss/cli` into a committed `css/tailwind.css`; a git pre-commit hook in `.githooks/` rebuilds it whenever its inputs are committed. Static assertions live in `tests/*.test.mjs` and run with Node's built-in test runner. Browser behaviour and visual parity are checked with Playwright (MCP browser tools), ImageMagick `compare`, and Lighthouse against a local static server.

**Tech Stack:** HTML5, Tailwind CSS v4 (`@tailwindcss/cli` 4.3.x), plain ES5-style JavaScript, Node 24 (`node:test`), POSIX `sh`, Playwright MCP browser tools, ImageMagick 6 (`compare`, `convert`), Lighthouse 13.5.0, Google Chrome at `/usr/bin/google-chrome`.

**Spec:** `docs/superpowers/specs/2026-09-24-performance-rebuild-design.md`

## Global Constraints

- All work happens on branch `perf/tailwind-build`; nothing merges into `main` until the owner approves the Task 8 results.
- Tailwind major version: v4 (`@tailwindcss/cli`), config in `src/tailwind.css`; no `tailwind.config.js`.
- Scanning is limited: `@import "tailwindcss" source(none);` plus `@source "../index.html";`.
- Theme tokens: `--font-sans: "DM Sans", Arial, sans-serif;` `--font-serif: "Fraunces", Georgia, serif;` `--color-accent: #E8854A;`.
- No `typography` or `forms` plugins.
- Dark-only colours: `--accent: #E8854A`, `--accent-hover: #D4622A`, `--bg-glass: rgba(30,32,38,0.88)`, `--text-primary: #F3F4F6`, `--text-secondary: #9CA3AF`, body `linear-gradient(135deg, #18191E 0%, #22242C 100%)`.
- Metas: `<meta name="color-scheme" content="dark">`, `<meta name="theme-color" content="#18191E">`.
- Skill-bar widths: expert 95%, advanced 75%, intermediate 55%, beginner 30%.
- The pre-commit hook watches exactly `index.html`, `src/tailwind.css`, `package.json`, `package-lock.json`.
- Git commits: no `Co-Authored-By` line (owner's standing rule).
- Do not touch the owner's unrelated uncommitted changes (deleted `assets/`, `README.md`, file-mode changes). Stage files by explicit path only; never `git add -A` or `git commit -a` in the real repository.
- Screenshots and Lighthouse output go under `.perf/` (gitignored), never committed.

## Review Focus

1. **Visitor lands mid-page or reloads scrolled** (for example `/#fh5co-projects`): the go-to-top button and nav shadow must already be showing, and the skill bars must fill if Skills is in view on load. Test in Task 5, Step 7.
2. **JavaScript fails to load or run:** skill bars must still show their full widths, because the widths live in CSS and JS only zeroes them when it is about to animate. Test in Task 5, Step 1 (static) and Step 7 (browser).
3. **`index.html` committed with further unstaged edits:** the hook builds from the working tree, so it must warn that unstaged changes are included, and the commit must still succeed. Test in Task 3, Step 1.
4. **Visitor whose operating system is in light mode:** the page must render dark. Test in Task 4, Step 6.
5. **Visitor with reduced motion enabled clicks go-to-top:** the page jumps to the top instantly, with no smooth scroll. Test in Task 5, Step 7.

---

## File Map

| Path | Status | Responsibility |
|---|---|---|
| `package.json` | Create | Dev dependencies; `build`, `test`, `prepare` scripts |
| `package-lock.json` | Create (npm) | Pins versions |
| `src/tailwind.css` | Create | Tailwind source and theme tokens |
| `css/tailwind.css` | Create (generated) | Compiled, minified utilities served by Pages |
| `.githooks/pre-commit` | Create | Rebuild and stage `css/tailwind.css` |
| `tests/site.test.mjs` | Create | Static assertions on `index.html`, CSS and JS |
| `tests/hook.test.mjs` | Create | Runs the real hook in throwaway git repos |
| `.gitignore` | Modify | Add `node_modules/`, `.perf/` |
| `index.html` | Modify | Head, theme, scripts, icons, avatar |
| `css/style.css` | Modify | Dark-only variables, icon rules, removed imports and transitions |
| `js/main.js` | Rewrite | Go-to-top, nav shadow, skill bars |
| `js/*` (9 vendor files), `css/icomoon.css`, `fonts/icomoon/`, `fonts/bootstrap/` | Delete | Unused after the rebuild |

---

### Task 1: Branch and baseline measurements

**Files:**
- Modify: `.gitignore`
- Create (ignored): `.perf/summary.cjs`, `.perf/baseline/*.png`, `.perf/baseline-{1,2,3}.json`

**Interfaces:**
- Produces: `.perf/summary.cjs <label>` prints a JSON median summary of `.perf/<label>-{1,2,3}.json`. Baseline screenshots are named `<viewport>-<part>.png`, where `<viewport>` is `desktop` or `mobile` and `<part>` is one of `full`, `hero`, `about`, `resume`, `skills`, `projects`, `contact`, `footer`. Later tasks write the same names under `.perf/after/`.

- [ ] **Step 1: Create the branch**

```bash
cd /var/www/html/TapanDerasari.github.io
git switch -c perf/tailwind-build
```

Expected: `Switched to a new branch 'perf/tailwind-build'`

- [ ] **Step 2: Ignore build and measurement output**

Replace the contents of `.gitignore` (currently only `.qodo`) with:

```
.qodo
node_modules/
.perf/
```

- [ ] **Step 3: Start a local static server** (background; leave it running for the whole plan)

```bash
cd /var/www/html/TapanDerasari.github.io && python3 -m http.server 8765 --bind 127.0.0.1
```

Check: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8765/index.html` prints `200`.

- [ ] **Step 4: Create the Lighthouse summary script** at `.perf/summary.cjs`

```js
// Usage: node .perf/summary.cjs <label>  -> median of .perf/<label>-{1,2,3}.json
const fs = require('fs');
const label = process.argv[2];
const runs = [1, 2, 3].map(i => JSON.parse(fs.readFileSync(`.perf/${label}-${i}.json`, 'utf8')));
const median = values => values.slice().sort((a, b) => a - b)[1];
const pick = fn => median(runs.map(fn));
console.log(JSON.stringify({
  performance: pick(r => Math.round(r.categories.performance.score * 100)),
  accessibility: pick(r => Math.round(r.categories.accessibility.score * 100)),
  bestPractices: pick(r => Math.round(r.categories['best-practices'].score * 100)),
  lcpMs: pick(r => Math.round(r.audits['largest-contentful-paint'].numericValue)),
  cls: pick(r => Number(r.audits['cumulative-layout-shift'].numericValue.toFixed(3))),
  tbtMs: pick(r => Math.round(r.audits['total-blocking-time'].numericValue)),
  transferKB: pick(r => Math.round(r.audits['total-byte-weight'].numericValue / 1024)),
}, null, 2));
```

- [ ] **Step 5: Run Lighthouse three times on the current site**

```bash
cd /var/www/html/TapanDerasari.github.io
for i in 1 2 3; do
  CHROME_PATH=/usr/bin/google-chrome npx -y lighthouse@13.5.0 http://127.0.0.1:8765/index.html \
    --quiet --chrome-flags="--headless=new --no-sandbox" \
    --output=json --output-path=.perf/baseline-$i.json
done
node .perf/summary.cjs baseline | tee .perf/baseline-summary.json
```

Expected: a JSON object with seven numeric fields. Keep it; Task 8 compares against it.

- [ ] **Step 6: Capture baseline screenshots**

Use the Playwright MCP tools. Emulate `colorScheme: "dark"` and `reducedMotion: "reduce"` first. Dark matches the new dark-only site; reduced motion stops the hero animations, so screenshots are deterministic.

For each viewport, `desktop` = 1440×900 and `mobile` = 390×844:
1. `browser_resize` to the viewport.
2. `browser_navigate` to `http://127.0.0.1:8765/index.html`.
3. `browser_evaluate`: `() => { document.getElementById('fh5co-skills').scrollIntoView(); return new Promise(r => setTimeout(() => { scrollTo(0, 0); setTimeout(r, 1500); }, 1500)); }` (fills the skill bars, then returns to the top).
4. `browser_take_screenshot` with `fullPage: true`, `scale: "css"`, `filename: ".perf/baseline/<viewport>-full.png"`.
5. For each part, take `browser_take_screenshot` with `scale: "css"`, `target` = the selector, `filename: ".perf/baseline/<viewport>-<part>.png"`:
   - `hero`: `header.hero-section`
   - `about`: `#fh5co-about`
   - `resume`: `#fh5co-resume`
   - `skills`: `#fh5co-skills`
   - `projects`: `#fh5co-projects`
   - `contact`: `#fh5co-contact`
   - `footer`: `#fh5co-footer`
6. `browser_evaluate` `() => scrollTo(0, 0)` before moving to the next viewport.

Check: `ls .perf/baseline | wc -l` prints `16`.

- [ ] **Step 7: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore node_modules and local perf output"
```

---

### Task 2: Compile Tailwind instead of loading the CDN

**Files:**
- Create: `package.json`, `package-lock.json`, `src/tailwind.css`, `css/tailwind.css`, `tests/site.test.mjs`
- Modify: `index.html:35-57` (CDN script and inline config), plus one new `<link>`

**Interfaces:**
- Produces: `npm run build` writes `css/tailwind.css`. `npm test` runs every `tests/*.test.mjs`. `tests/site.test.mjs` exports nothing; later tasks append `test(...)` blocks to it and reuse its `read(path)` and `exists(path)` helpers.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "tapanderasari-portfolio",
  "private": true,
  "scripts": {
    "build": "tailwindcss -i src/tailwind.css -o css/tailwind.css --minify",
    "test": "node --test \"tests/*.test.mjs\"",
    "prepare": "git config core.hooksPath .githooks"
  },
  "devDependencies": {
    "@tailwindcss/cli": "^4.3.3",
    "tailwindcss": "^4.3.3"
  }
}
```

`tailwindcss` is listed next to the CLI because `src/tailwind.css` imports it directly, which is how Tailwind's own install instructions set it up.

- [ ] **Step 2: Write the failing tests** in `tests/site.test.mjs`

```js
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

test('compiled Tailwind loads before style.css', () => {
  const html = read('index.html');
  const tw = html.indexOf('href="css/tailwind.css"');
  const custom = html.indexOf('href="css/style.css"');
  assert.ok(tw !== -1, 'css/tailwind.css is not linked');
  assert.ok(tw < custom, 'css/tailwind.css must come before css/style.css');
});

test('compiled CSS covers the utilities index.html uses, without plugins', () => {
  assert.ok(exists('css/tailwind.css'), 'css/tailwind.css missing; run npm run build');
  const css = read('css/tailwind.css');
  assert.ok(css.includes('.max-w-5xl'), 'missing .max-w-5xl');
  assert.ok(css.includes('.sm\\:inline'), 'missing .sm:inline');
  assert.ok(!css.includes('.prose'), 'typography plugin output found');
});
```

- [ ] **Step 3: Install dependencies and confirm the tests fail**

```bash
npm install
npm test
```

Expected: all 3 tests FAIL (CDN still present; `css/tailwind.css` not linked or missing).

- [ ] **Step 4: Create `src/tailwind.css`**

```css
/*
 * Tailwind source for index.html.
 * Setup: npm install   (also enables the pre-commit hook)
 * Build: npm run build (writes css/tailwind.css; the hook runs this for you)
 */
@import "tailwindcss" source(none);
@source "../index.html";

@theme {
  --font-sans: "DM Sans", Arial, sans-serif;
  --font-serif: "Fraunces", Georgia, serif;
  --color-accent: #E8854A;
}
```

- [ ] **Step 5: Swap the CDN for the compiled file in `index.html`**

Delete this whole block (the Tailwind CDN comment and script, and the inline config script):

```html
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com?plugins=typography,forms"></script>
    <script>
      tailwind.config = {
        ...
      }
    </script>
```

Then change:

```html
    <!-- Main Stylesheet -->
    <link rel="stylesheet" href="css/style.css">
```

to:

```html
    <!-- Compiled Tailwind utilities (npm run build) -->
    <link rel="stylesheet" href="css/tailwind.css">
    <!-- Main Stylesheet -->
    <link rel="stylesheet" href="css/style.css">
```

- [ ] **Step 6: Build and confirm the tests pass**

```bash
npm run build
npm test
```

Expected: `css/tailwind.css` is written; all 3 tests PASS. Check its size with `wc -c css/tailwind.css`; it should be under 15000 bytes.

- [ ] **Step 7: Check for cascade and version regressions (spec §8 risks 1–2)**

Using the Task 1 Step 6 procedure, save the desktop and mobile screenshots to `.perf/after/`. Then:

```bash
mkdir -p .perf/diff
for f in .perf/baseline/*.png; do
  n=$(basename "$f")
  printf '%s ' "$n"
  compare -metric AE -fuzz 3% "$f" ".perf/after/$n" ".perf/diff/$n" 2>&1
  echo
done
```

Expected: `0` or a small number (under about 0.5% of the image's pixels) for every file. For any larger count, open `.perf/diff/<name>.png` and both screenshots with the Read tool. Fix each real difference by adding the smallest override to `css/style.css`, then re-run this step. A dimension-mismatch error means the page height changed; treat it as a regression.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/tailwind.css css/tailwind.css tests/site.test.mjs index.html css/style.css
git commit -m "perf: compile Tailwind v4 with the CLI instead of the Play CDN"
```

(Include `css/style.css` only if Step 7 needed an override.)

---

### Task 3: Pre-commit hook that rebuilds Tailwind

**Files:**
- Create: `.githooks/pre-commit` (executable), `tests/hook.test.mjs`

**Interfaces:**
- Consumes: the `build` script and `src/tailwind.css` from Task 2.
- Produces: a hook that rebuilds and runs `git add css/tailwind.css` when a watched file is staged. Every later commit that stages `index.html` runs it automatically.

- [ ] **Step 1: Write the failing hook tests** in `tests/hook.test.mjs`

```js
// Runs the real pre-commit hook inside throwaway git repositories.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, symlinkSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'hook-test-'));
  for (const path of ['index.html', 'package.json', 'src', '.githooks']) {
    cpSync(join(root, path), join(dir, path), { recursive: true });
  }
  mkdirSync(join(dir, 'css'));
  cpSync(join(root, 'css/tailwind.css'), join(dir, 'css/tailwind.css'));
  symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'));
  writeFileSync(join(dir, '.gitignore'), 'node_modules\n');
  const git = (...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 'hook-test@example.com');
  git('config', 'user.name', 'Hook Test');
  git('add', '-A');
  git('commit', '-q', '-m', 'initial');
  git('config', 'core.hooksPath', '.githooks');
  return { dir, git, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const addClassToIndex = (dir, cls) => {
  const file = join(dir, 'index.html');
  writeFileSync(file, readFileSync(file, 'utf8').replace('</footer>', `<p class="${cls}">x</p></footer>`));
};

test('rebuilds and stages css/tailwind.css when index.html is committed', () => {
  const { dir, git, cleanup } = makeRepo();
  try {
    addClassToIndex(dir, 'tracking-widest');
    git('add', 'index.html');
    const result = git('commit', '-m', 'use a new utility');
    assert.equal(result.status, 0, result.stderr);
    const committedCss = git('show', 'HEAD:css/tailwind.css').stdout;
    assert.ok(committedCss.includes('.tracking-widest'), 'new utility missing from committed CSS');
  } finally { cleanup(); }
});

test('blocks the commit when the build fails', () => {
  const { dir, git, cleanup } = makeRepo();
  try {
    writeFileSync(join(dir, 'src/tailwind.css'), '@import "no-such-package";\n');
    git('add', 'src/tailwind.css');
    const result = git('commit', '-m', 'broken source');
    assert.notEqual(result.status, 0, 'commit should have been blocked');
    assert.match(result.stderr, /commit blocked/);
  } finally { cleanup(); }
});

test('blocks the commit when dependencies are not installed', () => {
  const { dir, git, cleanup } = makeRepo();
  try {
    rmSync(join(dir, 'node_modules'));
    addClassToIndex(dir, 'tracking-wide');
    git('add', 'index.html');
    const result = git('commit', '-m', 'no deps');
    assert.notEqual(result.status, 0, 'commit should have been blocked');
    assert.match(result.stderr, /npm install/);
  } finally { cleanup(); }
});

test('skips the build when no watched file is staged', () => {
  const { dir, git, cleanup } = makeRepo();
  try {
    rmSync(join(dir, 'node_modules')); // a build attempt would now fail
    writeFileSync(join(dir, 'notes.txt'), 'unrelated\n');
    git('add', 'notes.txt');
    const result = git('commit', '-m', 'unrelated change');
    assert.equal(result.status, 0, result.stderr);
  } finally { cleanup(); }
});

test('warns, but still commits, when index.html also has unstaged edits', () => {
  const { dir, git, cleanup } = makeRepo();
  try {
    addClassToIndex(dir, 'tracking-widest');
    git('add', 'index.html');
    addClassToIndex(dir, 'tracking-tighter'); // unstaged
    const result = git('commit', '-m', 'partial stage');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /unstaged changes/);
  } finally { cleanup(); }
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

```bash
npm test
```

Expected: the 3 `site.test.mjs` tests PASS. All 5 `hook.test.mjs` tests FAIL with `ENOENT` for `.githooks`, because the hook folder doesn't exist yet and `makeRepo` copies it.

- [ ] **Step 3: Create `.githooks/pre-commit`**

```sh
#!/bin/sh
# Rebuild the compiled Tailwind CSS whenever its inputs are part of a commit,
# so css/tailwind.css on GitHub Pages never falls out of date.

watched_staged=$(git diff --cached --name-only --diff-filter=ACMR -- \
  index.html src/tailwind.css package.json package-lock.json)

[ -z "$watched_staged" ] && exit 0

if [ ! -x node_modules/.bin/tailwindcss ]; then
  echo "pre-commit: Tailwind CLI not installed. Run 'npm install' first; commit blocked." >&2
  exit 1
fi

for f in index.html src/tailwind.css; do
  if ! git diff --quiet -- "$f"; then
    echo "pre-commit: warning: $f has unstaged changes; the CSS build includes them." >&2
  fi
done

if ! npm run --silent build >&2; then
  echo "pre-commit: Tailwind build failed; commit blocked." >&2
  exit 1
fi

git add css/tailwind.css
```

Make it executable:

```bash
chmod +x .githooks/pre-commit
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
npm test
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Enable the hook in this repository**

```bash
npm run prepare
git config core.hooksPath
```

Expected: prints `.githooks`.

- [ ] **Step 6: Commit** (commits `.githooks/pre-commit` with its executable bit)

```bash
git add .githooks/pre-commit tests/hook.test.mjs
git commit -m "build: add pre-commit hook that rebuilds compiled Tailwind"
```

---

### Task 4: Dark-only theme

**Files:**
- Modify: `index.html` (head metas, `<body>` classes, top-of-body theme script, nav toggle button and border, footer border, end-of-body toggle script)
- Modify: `css/style.css:15-45` (variables, body, `body.dark-mode`, global transition) and the six `body.dark-mode …` rules
- Test: `tests/site.test.mjs`

**Interfaces:**
- Produces: `:root` variables hold the dark values; no element, class or script refers to a light theme or to `dark-mode`.

- [ ] **Step 1: Append the failing tests** to `tests/site.test.mjs`

```js
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
```

- [ ] **Step 2: Run and confirm the two new tests fail**

```bash
npm test
```

Expected: the 2 new tests FAIL; the other 8 PASS.

- [ ] **Step 3: Edit `css/style.css`**

Replace the `:root` block, the `body` block, the `body.dark-mode` block and the `* { transition … }` block (currently lines 15–45) with:

```css
:root {
  --accent: #E8854A;
  --accent-hover: #D4622A;
  --bg-glass: rgba(30,32,38,0.88);
  --text-primary: #F3F4F6;
  --text-secondary: #9CA3AF;
  --shadow-glass: 0 8px 32px 0 rgba(0,0,0,0.08);
  --border-radius: 1.3rem;
}

body {
  font-family: 'DM Sans', Arial, sans-serif;
  font-weight: 400;
  font-size: 17px;
  line-height: 1.7;
  color: var(--text-primary);
  background: linear-gradient(135deg, #18191E 0%, #22242C 100%);
}
```

Fold each remaining `body.dark-mode` rule into its base rule and delete the `body.dark-mode` rule:

| Base rule | Change |
|---|---|
| `.skill-card-icon` | `background: rgba(212,98,42,0.10);` → `background: rgba(232,133,74,0.15);` |
| `.skill-bar-wrap` | `background: rgba(0,0,0,0.06);` → `background: rgba(255,255,255,0.08);` |
| `.skill-card` | add `border-color: rgba(255,255,255,0.06);` as the last declaration |
| `.skill-item` | `border-bottom: 1px solid rgba(0,0,0,0.04);` → `border-bottom: 1px solid rgba(255,255,255,0.05);` |
| `.project-card` | add `border-color: rgba(255,255,255,0.06);` as the last declaration of the first `.project-card { … }` rule |
| `.project-tags span` | `background: rgba(212,98,42,0.08);` → `background: rgba(232,133,74,0.12);` |

Check: `grep -c 'dark-mode' css/style.css` prints `0`.

- [ ] **Step 4: Edit `index.html`**

1. In `<head>`, directly after `<meta name="viewport" …>`, add:
   ```html
       <meta name="color-scheme" content="dark">
       <meta name="theme-color" content="#18191E">
   ```
2. `<body class="min-h-screen transition-colors duration-400">` → `<body class="min-h-screen">`
3. Delete the whole block that starts `<!-- Apply saved theme before first paint to avoid a light-mode flash -->`, including its `<script>…</script>`.
4. In the nav, change `border-bottom: 1px solid rgba(0,0,0,0.08);` to `border-bottom: 1px solid rgba(255,255,255,0.08);`, and delete the whole `<button id="darkModeToggle" …>🌙 Dark</button>` element (3 lines).
5. In the footer, change `border-top: 1px solid rgba(0,0,0,0.08);` to `border-top: 1px solid rgba(255,255,255,0.08);`
6. Delete the whole `<!-- Dark mode toggle script -->` comment and the `<script>…</script>` after it.

- [ ] **Step 5: Run the tests and confirm they pass**

```bash
npm test
```

Expected: all 10 tests PASS.

- [ ] **Step 6: Check in the browser** (Review Focus 4)

With the Playwright MCP tools, emulate `colorScheme: "light"` and navigate to `http://127.0.0.1:8765/index.html`. Then evaluate:

```js
() => ({
  bg: getComputedStyle(document.body).backgroundImage,
  text: getComputedStyle(document.body).color,
  toggle: !!document.getElementById('darkModeToggle'),
})
```

Expected: `bg` contains `rgb(24, 25, 30)`, `text` is `rgb(243, 244, 246)`, `toggle` is `false`.

Then emulate `colorScheme: "dark"` and `reducedMotion: "reduce"`, capture the 16 screenshots into `.perf/after/` (Task 1 Step 6 procedure), and run the Task 2 Step 7 `compare` loop. Expected differences, from spec §7: the toggle area in the nav and the now-visible nav and footer borders. The `about`, `skills` and `projects` shots should be identical to the baseline, because the baseline was already captured in dark mode and the folded values are the same dark values. Investigate anything else.

- [ ] **Step 7: Commit** (the hook rebuilds `css/tailwind.css`, because `index.html` is staged)

```bash
git add index.html css/style.css tests/site.test.mjs
git commit -m "feat: make the site dark-only and remove the theme toggle"
```

Check: `git show --stat HEAD` lists `css/tailwind.css`, since removing `transition-colors` and `duration-400` changes the compiled CSS.

---

### Task 5: Replace jQuery with plain JavaScript

**Files:**
- Rewrite: `js/main.js`
- Modify: `index.html` (script tags, inline scripts, `animate-box` classes, go-to-top link)
- Modify: `css/style.css` (remove `.js .animate-box`, add `scroll-behavior`)
- Delete: `js/jquery.min.js`, `js/jquery.easing.1.3.js`, `js/jquery.waypoints.min.js`, `js/jquery.easypiechart.min.js`, `js/jquery.stellar.min.js`, `js/modernizr-2.6.2.min.js`, `js/respond.min.js`, `js/bootstrap.min.js`, `js/google_map.js`
- Test: `tests/site.test.mjs`

**Interfaces:**
- Consumes: the existing CSS contract. `.gototop.active` shows the button; `#main-nav.scrolled` adds the nav shadow; `.skill-bar-fill[data-level=…]` sets each bar's final width in CSS (`css/style.css:606-609`).
- Produces: `js/main.js` loaded with `defer`. With JS, bars start at inline `width: 0%` and the inline width is cleared, so the CSS width applies, when Skills becomes 15% visible. Without JS, bars show their CSS widths.

- [ ] **Step 1: Append the failing tests** to `tests/site.test.mjs`

```js
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
```

- [ ] **Step 2: Run and confirm the new tests fail**

```bash
npm test
```

Expected: the 6 new tests FAIL, except "skill bar widths…", which PASSES because it pins existing behaviour. The earlier 10 PASS.

- [ ] **Step 3: Rewrite `js/main.js`** (replace the entire file)

```js
// Page behaviours: go-to-top button, nav shadow, skill-bar fill.
// Loaded with `defer`; everything degrades to static content without it.
(function () {
  'use strict';

  if (!('IntersectionObserver' in window)) return;

  // Show go-to-top and the nav shadow once the hero is out of view.
  var header = document.querySelector('header.hero-section');
  var nav = document.getElementById('main-nav');
  var toTop = document.querySelector('.js-top');
  if (header) {
    new IntersectionObserver(function (entries) {
      var pastHero = !entries[0].isIntersecting;
      if (toTop) toTop.classList.toggle('active', pastHero);
      if (nav) nav.classList.toggle('scrolled', pastHero);
    }).observe(header);
  }

  // Grow skill bars from 0 to their CSS width the first time Skills is seen.
  var skills = document.getElementById('fh5co-skills');
  if (skills) {
    var bars = skills.querySelectorAll('.skill-bar-fill');
    bars.forEach(function (bar) { bar.style.width = '0%'; });
    var skillsObserver = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      skillsObserver.disconnect();
      bars.forEach(function (bar, i) {
        setTimeout(function () { bar.style.width = ''; }, 80 * i);
      });
    }, { threshold: 0.15 });
    skillsObserver.observe(skills);
  }
})();
```

- [ ] **Step 4: Edit `index.html`**

1. Remove ` animate-box` from every `class` attribute. Check with `grep -c 'animate-box' index.html`, which should print `0`. Use: `sed -i -E 's/ animate-box//g; s/animate-box //g' index.html`.
2. Change the go-to-top link from `<a href="#" class="js-gotop">` to `<a href="#page" class="js-gotop" aria-label="Back to top">`.
3. Delete everything from `<!-- jQuery -->` through the closing `</script>` of `<!-- Nav scroll shadow -->`. That covers these script tags: jQuery, easing, Waypoints, EasyPieChart, `js/main.js`, the skill-bar inline script and the nav inline script.
4. In `<head>`, directly before `</head>`, add:
   ```html
       <script src="js/main.js" defer></script>
   ```

- [ ] **Step 5: Edit `css/style.css`**

1. Delete:
   ```css
   .js .animate-box {
     opacity: 0;
   }
   ```
2. Directly above the `body {` rule, add:
   ```css
   html {
     scroll-behavior: smooth;
   }
   ```

- [ ] **Step 6: Delete the vendor scripts and run the tests**

```bash
git rm -q js/jquery.min.js js/jquery.easing.1.3.js js/jquery.waypoints.min.js js/jquery.easypiechart.min.js js/jquery.stellar.min.js js/modernizr-2.6.2.min.js js/respond.min.js js/bootstrap.min.js js/google_map.js
npm test
```

(If `git rm` refuses because of the owner's file-mode changes, use `git rm -qf`. Those files only have mode changes, with no content changes.)

Expected: all 16 tests PASS.

- [ ] **Step 7: Check behaviour in the browser** (Review Focus 1, 2 and 5)

With the Playwright MCP tools, using the 1440×900 viewport and colour scheme dark, navigate to `http://127.0.0.1:8765/index.html`.

**a. At the top of the page.** Evaluate:
```js
() => ({ top: document.querySelector('.js-top').classList.contains('active'),
         nav: document.getElementById('main-nav').classList.contains('scrolled'),
         bar: document.querySelector('.skill-bar-fill').style.width })
```
Expected: `{ top: false, nav: false, bar: "0%" }`.

**b. After scrolling to Skills.** Evaluate:
```js
async () => { document.getElementById('fh5co-skills').scrollIntoView();
  await new Promise(r => setTimeout(r, 2500));
  const bars = [...document.querySelectorAll('.skill-bar-fill')];
  return { top: document.querySelector('.js-top').classList.contains('active'),
           nav: document.getElementById('main-nav').classList.contains('scrolled'),
           widths: bars.slice(0, 4).map(b => Math.round(b.getBoundingClientRect().width / b.parentElement.getBoundingClientRect().width * 100)) }; }
```
Expected: `top: true`, `nav: true`, `widths: [95, 95, 75, 75]` (PHP and Laravel are expert; MySQL and REST APIs are advanced).

**c. Go-to-top with reduced motion.** Emulate `reducedMotion: "reduce"`, click the go-to-top link (`browser_click` on `.js-gotop`), then evaluate `() => Math.round(scrollY)`. Expected: `0` straight after the click (no smooth scroll).

**d. Landing mid-page (Review Focus 1).** Navigate to `http://127.0.0.1:8765/index.html#fh5co-projects`, wait 1 second, and evaluate:
```js
() => ({ top: document.querySelector('.js-top').classList.contains('active'),
         nav: document.getElementById('main-nav').classList.contains('scrolled') })
```
Expected: `{ top: true, nav: true }`.

**e. No JavaScript (Review Focus 2).** Evaluate:
```js
async () => { const html = await (await fetch('index.html')).text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.querySelectorAll('script[src]').length === 1 && !doc.querySelector('.skill-bar-fill[style]'); }
```
Expected: `true`. Together with the static CSS-width test, this confirms bars render at full width when `main.js` doesn't run.

**f.** Check console messages at level `error`. Expected: none.

- [ ] **Step 8: Commit**

```bash
git add js/main.js index.html css/style.css tests/site.test.mjs
git commit -m "perf: replace jQuery and plugins with a small IntersectionObserver script"
```

(The vendor deletions were already staged by `git rm`.)

---

### Task 6: Inline SVG icons instead of the icon font

**Files:**
- Create (not committed): `.perf/make-sprite.mjs`, `.perf/sprite.svg`
- Modify: `index.html` (sprite after `<body>`, 22 `<i>` icons, the `css/icomoon.css` link)
- Modify: `css/style.css` (icomoon `@font-face`, `.icon` rule, 3 icon selectors plus layout of their containers)
- Delete: `css/icomoon.css`, `fonts/icomoon/`, `fonts/bootstrap/`
- Test: `tests/site.test.mjs`

**Interfaces:**
- Consumes: glyph paths in `fonts/icomoon/icomoon/fonts/icomoon.svg` (units-per-em 1024, ascent 960). Read the sprite in Step 3 **before** deleting the font in Step 7.
- Produces: 13 `<symbol id="icon-NAME">` elements; icons are used as `<svg class="icon" aria-hidden="true"><use href="#icon-NAME"/></svg>`.

- [ ] **Step 1: Append the failing tests** to `tests/site.test.mjs`

```js
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
```

- [ ] **Step 2: Run and confirm the new tests fail**

```bash
npm test
```

Expected: the 3 new tests FAIL; the earlier 16 PASS.

- [ ] **Step 3: Generate the sprite**

Create `.perf/make-sprite.mjs`:

```js
// One-off: turn the 13 icomoon glyphs used by index.html into an SVG sprite.
import { readFileSync } from 'node:fs';

const FONT = 'fonts/icomoon/icomoon/fonts/icomoon.svg';
const EM = 1024;
const ASCENT = 960;
const ICONS = {
  'arrow-up22': 'ebf8', cloud: 'e04b', database: 'e992', envelop: 'eb03',
  github2: 'ec6d', 'graduation-cap': 'e9b1', linkedin2: 'ea74', location3: 'eb05',
  monitor: 'eaaf', phone3: 'eb00', suitcase: 'ea20', twitter2: 'ea7d', wrench: 'eb4f',
};

const font = readFileSync(FONT, 'utf8');
const glyphs = new Map();
for (const tag of font.match(/<glyph\b[^>]*>/g)) {
  const attr = (name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];
  const codepoint = (attr('unicode') || '').match(/^&#x([0-9a-f]+);$/i);
  if (codepoint) glyphs.set(codepoint[1].toLowerCase(), { d: attr('d'), width: Number(attr('horiz-adv-x') || EM) });
}

const symbols = Object.entries(ICONS).map(([name, cp]) => {
  const glyph = glyphs.get(cp);
  if (!glyph || !glyph.d) throw new Error(`missing glyph for icon-${name} (${cp})`);
  // Font glyphs are y-up with the baseline at 0; flip into SVG's y-down box.
  return `<symbol id="icon-${name}" viewBox="0 0 ${glyph.width} ${EM}">` +
    `<path transform="matrix(1 0 0 -1 0 ${ASCENT})" d="${glyph.d.replace(/\s+/g, ' ').trim()}"/></symbol>`;
});

process.stdout.write(`<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols.join('')}</svg>\n`);
```

Run it:

```bash
node .perf/make-sprite.mjs > .perf/sprite.svg
grep -o '<symbol' .perf/sprite.svg | wc -l
wc -c .perf/sprite.svg
```

Expected: `13` symbols; size roughly 3–8 KB. If a glyph is missing, the script throws and names it.

- [ ] **Step 4: Put the sprite and SVG icons into `index.html`**

```bash
python3 - <<'EOF'
import re, pathlib
page = pathlib.Path('index.html')
html = page.read_text()
sprite = pathlib.Path('.perf/sprite.svg').read_text().strip()
html, n_body = re.subn(r'(<body[^>]*>\n)', lambda m: m.group(1) + '  ' + sprite + '\n', html, count=1)
html, n_icons = re.subn(r'<i class="icon-([a-z0-9-]+)"></i>',
                        r'<svg class="icon" aria-hidden="true"><use href="#icon-\1"/></svg>', html)
html = html.replace('    <!-- Icomoon Icon Fonts-->\n    <link rel="stylesheet" href="css/icomoon.css">\n', '')
page.write_text(html)
print('sprite inserted:', n_body, 'icons replaced:', n_icons)
EOF
```

Expected output: `sprite inserted: 1 icons replaced: 22`.

- [ ] **Step 5: Update `css/style.css`**

1. Delete the icomoon `@font-face { … }` block at the top of the file (lines 2–8).
2. Directly after the `html { scroll-behavior: smooth; }` rule, add:
   ```css
   .icon {
     width: 1em;
     height: 1em;
     fill: currentColor;
     vertical-align: -0.125em;
   }
   ```
3. In `.timeline > li > .timeline-badge`, replace `display: table;` with:
   ```css
     display: flex;
     align-items: center;
     justify-content: center;
   ```
   Then replace the rule `.timeline > li > .timeline-badge i { display: table-cell; vertical-align: middle; height: 44px; font-size: 18px; }` with:
   ```css
   .timeline > li > .timeline-badge .icon {
     font-size: 18px;
     vertical-align: 0;
   }
   ```
4. Rename the selector `.contact-info li i` to `.contact-info li .icon` (declarations unchanged).
5. In `.gototop a`, replace `display: table;` with:
   ```css
     display: flex;
     align-items: center;
     justify-content: center;
   ```
   Then replace the rule `.gototop a i { height: 50px; display: table-cell; vertical-align: middle; }` with:
   ```css
   .gototop a .icon {
     vertical-align: 0;
   }
   ```
6. Check for any other selector that styled these icons: `grep -nE '(^|[ ,>])i([ ,:{.]|$)' css/style.css`. Rename any hit that targets an icon `<i>` to `.icon`. Hits on other elements stay.

- [ ] **Step 6: Visual check before deleting the font**

Capture `.perf/after/` screenshots (Task 1 Step 6 procedure), run the `compare` loop, and use the Read tool to compare these by eye, baseline against after:
- `hero` (social icons)
- `about` (social buttons)
- `resume` (timeline badges)
- `skills` (card icons)
- `contact` (contact list icons)

Icons must be the same glyph, size and position, give or take a pixel. Also scroll down on desktop so the go-to-top button shows, and screenshot `.gototop` to confirm the arrow is centred in the circle. Fix any misalignment in `css/style.css` before continuing.

- [ ] **Step 7: Delete the font files and run the tests**

```bash
git rm -rq css/icomoon.css fonts/icomoon fonts/bootstrap
npm test
```

(Use `git rm -rqf` if the owner's file-mode changes block removal.)

Expected: all 19 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add index.html css/style.css tests/site.test.mjs
git commit -m "perf: replace icomoon font with an inline SVG sprite"
```

---

### Task 7: Loading order and avatar hints

**Files:**
- Modify: `index.html` (`<head>` order, avatar `<img>`)
- Modify: `css/style.css:1` (Google Fonts `@import`)
- Test: `tests/site.test.mjs`

**Interfaces:**
- Consumes: the head produced by Tasks 2, 4, 5 and 6.
- Produces: the final `<head>` order from spec §6.

- [ ] **Step 1: Append the failing tests** to `tests/site.test.mjs`

```js
test('head loads resources in the specified order', () => {
  const head = read('index.html').split('</head>')[0];
  const order = [
    'name="color-scheme"',
    'rel="icon"',
    'property="og:title"',
    'rel="preconnect" href="https://fonts.googleapis.com"',
    'rel="preconnect" href="https://fonts.gstatic.com" crossorigin',
    'href="https://fonts.googleapis.com/css2?',
    'href="css/tailwind.css"',
    'href="css/style.css"',
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
```

- [ ] **Step 2: Run and confirm the new tests fail**

```bash
npm test
```

Expected: "head loads…" FAILS (no preconnect hints); "Google Fonts load once…" FAILS (the `@import`); "hero avatar…" FAILS. The earlier 19 PASS.

- [ ] **Step 3: Remove the duplicate font import**

Delete line 1 of `css/style.css`, the one starting `@import url('https://fonts.googleapis.com/css2?family=Fraunces…`.

- [ ] **Step 4: Add preconnect hints and avatar attributes in `index.html`**

1. Directly before the Google Fonts `<link href="https://fonts.googleapis.com/css2?…" rel="stylesheet">`, add:
   ```html
       <link rel="preconnect" href="https://fonts.googleapis.com">
       <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   ```
2. Change
   `<img src="https://avatars.githubusercontent.com/u/41634687" alt="Tapan Derasari" class="hero-avatar-img">`
   to
   `<img src="https://avatars.githubusercontent.com/u/41634687" alt="Tapan Derasari" class="hero-avatar-img" width="460" height="460" fetchpriority="high" decoding="async">`
3. Confirm the rest of the order already matches spec §6: metas, icon links, OG/Twitter metas, fonts, `css/tailwind.css`, `css/style.css`, JSON-LD, then `js/main.js`. If JSON-LD sits before the stylesheets, move the `<script type="application/ld+json">…</script>` block so it follows `css/style.css` and precedes `js/main.js`.

- [ ] **Step 5: Run the tests**

```bash
npm test
```

Expected: all 22 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add index.html css/style.css tests/site.test.mjs
git commit -m "perf: preconnect fonts, drop duplicate @import, size the hero avatar"
```

---

### Task 8: Final verification and report

**Files:**
- Create (ignored): `.perf/after-{1,2,3}.json`, `.perf/after/*.png`, `.perf/diff/*.png`

**Interfaces:**
- Consumes: `.perf/summary.cjs`, `.perf/baseline-summary.json` and `.perf/baseline/*.png` from Task 1.

- [ ] **Step 1: Full test suite**

```bash
npm test
```

Expected: 22 tests, 0 failures.

- [ ] **Step 2: Lighthouse after the rebuild**

```bash
for i in 1 2 3; do
  CHROME_PATH=/usr/bin/google-chrome npx -y lighthouse@13.5.0 http://127.0.0.1:8765/index.html \
    --quiet --chrome-flags="--headless=new --no-sandbox" \
    --output=json --output-path=.perf/after-$i.json
done
node .perf/summary.cjs after | tee .perf/after-summary.json
cat .perf/baseline-summary.json
```

Pass criteria (spec §1):
- `performance`, `accessibility` and `bestPractices` are each ≥ baseline.
- `performance` is ≥ 90.
- `transferKB` is lower than baseline.

- [ ] **Step 3: Network and console check**

With the Playwright MCP tools, navigate to `http://127.0.0.1:8765/index.html`, scroll to the bottom and back, then:
- `browser_network_requests`: no URL contains `cdn.tailwindcss.com`, `jquery`, `icomoon` or `waypoints`.
- `browser_console_messages` at level `warning`: no errors, and no "should not be used in production" warning.

- [ ] **Step 4: Final screenshot comparison**

Capture all 16 shots into `.perf/after/` (Task 1 Step 6 procedure) and run the `compare` loop from Task 2 Step 7. Every non-trivial difference must be one of the spec §7 intended changes:
- the toggle removed
- visible nav and footer borders
- sub-pixel icon differences

Use the Read tool to view each file with a large count, next to its baseline.

- [ ] **Step 5: Report to the owner**

Present, in chat:
1. A table: each Lighthouse metric, baseline, after, and the change.
2. The screenshot comparison result per section, noting any intended differences.
3. Test results (22 of 22) and the hook tests' outcome.
4. Anything that deviated from the spec, and why.

Then use the superpowers:finishing-a-development-branch skill. Merge `perf/tailwind-build` into `main` with a merge commit only after the owner approves. The rollback is `git revert -m 1 <merge-commit>`.

- [ ] **Step 6: Stop the local server**

Stop the background `python3 -m http.server 8765` task.
