# Performance Rebuild — Design

**Date:** 2026-09-24
**Status:** Approved in conversation (sections 1–4); awaiting written-spec review
**Branch:** `perf/tailwind-build`
**Follows:** commit `04bc918` (group A quick fixes)

---

## 1. Goal and success criteria

Make `index.html` load fast by removing runtime CSS generation, unused JavaScript and the icon font, and simplify the site to a single dark theme. The page must look the same as today apart from the intended changes listed in §7.

Success means all of the following:

- No request to `cdn.tailwindcss.com`; no Tailwind "should not be used in production" console warning.
- No jQuery or jQuery plugins loaded; no icon font loaded.
- Zero console errors.
- Lighthouse (mobile, local) Performance, Accessibility and Best Practices scores are each ≥ the baseline, with Performance expected at 90+.
- Total transferred bytes for the page are lower than the baseline.
- Desktop (1440px) and mobile (390px) screenshots match the baseline section by section, except for the changes in §7.
- A commit that touches `index.html` without rebuilding still ends up with a fresh `css/tailwind.css`.

## 2. Decisions already made

| Decision | Choice | Why |
|---|---|---|
| CSS strategy | Keep Tailwind, compile with the CLI, commit the output | Owner's choice (option B); keeps Tailwind available for future work |
| Tailwind version | v4 (`@tailwindcss/cli`) | Current major version; config lives in CSS instead of a JS object |
| Stale-build guard | Git pre-commit hook in `.githooks/`, enabled by `npm install` | Makes forgetting impossible, rather than detecting it after the site is broken |
| Theme | Dark only; remove the toggle | Owner's choice |
| Icons | Inline SVG sprite extracted from the existing icomoon glyphs | Identical look; about 4 KB instead of a 51 KB stylesheet plus a font |
| JavaScript | Plain JS with `IntersectionObserver`, no libraries | Only three small behaviours are actually live |

## 3. Build tooling

### New files

| File | Purpose | Committed |
|---|---|---|
| `package.json` | Dev dependency `@tailwindcss/cli` (v4); scripts `build` and `prepare` | Yes |
| `package-lock.json` | Pins the exact CLI version | Yes |
| `src/tailwind.css` | Tailwind source: import, source scope, theme tokens | Yes |
| `css/tailwind.css` | Compiled, minified output served by GitHub Pages | Yes |
| `.githooks/pre-commit` | Rebuilds and stages `css/tailwind.css` when needed | Yes (executable) |

`.gitignore` gains `node_modules/`.

### `package.json` scripts

```json
{
  "private": true,
  "scripts": {
    "build": "tailwindcss -i src/tailwind.css -o css/tailwind.css --minify",
    "prepare": "git config core.hooksPath .githooks"
  },
  "devDependencies": {
    "@tailwindcss/cli": "^4"
  }
}
```

### `src/tailwind.css`

```css
@import "tailwindcss" source(none);
@source "../index.html";

@theme {
  --font-sans: "DM Sans", Arial, sans-serif;
  --font-serif: "Fraunces", Georgia, serif;
  --color-accent: #E8854A;
}
```

- `source(none)` plus one `@source` line limits scanning to `index.html`. Without it, Tailwind v4 would also scan the unused template pages and vendor files and generate CSS for classes in them.
- The accent token keeps only the dark value, since the site is dark-only. The unused `glass` and `glass-dark` colour tokens and the `accent.dark` variant are dropped.
- The `typography` and `forms` plugins are not carried over; no markup uses them.

### `.githooks/pre-commit`

Behaviour:

1. List staged files (`git diff --cached --name-only`).
2. If none of `index.html`, `src/tailwind.css`, `package.json` or `package-lock.json` is staged, exit 0.
3. If `node_modules/.bin/tailwindcss` is missing, print "Run npm install first" and exit 1, blocking the commit.
4. Run `npm run build`. If it fails, print the error and exit 1, blocking the commit.
5. `git add css/tailwind.css` and exit 0.

The hook is a POSIX `sh` script so it works on Linux and macOS without extra tooling.

### `index.html` changes

- Remove the `cdn.tailwindcss.com` script and the inline `tailwind.config` script.
- Add `<link rel="stylesheet" href="css/tailwind.css">` **before** `css/style.css`, so custom styles keep winning where both define a property (today the CDN injects its styles last; see §8 risk 2).

## 4. Dark-only theme

### `css/style.css`

- `:root` takes the current dark values: `--accent: #E8854A`, `--accent-hover: #D4622A`, `--bg-glass: rgba(30,32,38,0.88)`, `--text-primary: #F3F4F6`, `--text-secondary: #9CA3AF`.
- `body` uses the dark gradient `linear-gradient(135deg, #18191E 0%, #22242C 100%)`.
- Delete every `body.dark-mode` rule (7 occurrences), folding each dark value into its base rule.
- Delete `transition: background 0.4s, color 0.4s` on `body` and the global `* { transition: … }` rule; both existed for theme switching.

### `index.html`

- Remove the toggle button from the nav.
- Remove the top-of-body theme script and the end-of-body toggle script.
- Add `<meta name="color-scheme" content="dark">` and `<meta name="theme-color" content="#18191E">`.
- Replace the hard-coded `rgba(0,0,0,0.08)` borders on the nav and footer with `rgba(255,255,255,0.08)`.
- Remove the `transition-colors duration-400` utilities from `<body>` (their purpose was the theme switch; see §8 risk 3).

## 5. JavaScript and icons

### `js/main.js` (rewritten, loaded with `defer`)

Behaviours kept:

| Behaviour | Implementation |
|---|---|
| Go-to-top button appears after scrolling past the hero | `IntersectionObserver` on `header.hero-section`; toggles `.active` on `.js-top` when the header leaves the viewport |
| Go-to-top click | Plain `href="#page"` anchor plus `html { scroll-behavior: smooth }`; no JS needed. The group A reduced-motion rule already disables smooth scrolling for users who ask |
| Nav shadow once scrolled | Same header observer toggles `.scrolled` on `#main-nav` |
| Skill bars fill on first view | `IntersectionObserver` on `#fh5co-skills` (threshold about 0.15); sets each `.skill-bar-fill` width from its `data-level`, staggered 80ms, then disconnects |

The level-to-width map stays as today: expert 95%, advanced 75%, intermediate 55%, beginner 30%.

Behaviours removed, because none of them work today:

- Waypoints fade-in (`contentWayPoint`): requires a `js` class on `<html>` that nothing sets and `animate.css`, which is not loaded. Remove every `animate-box` class from `index.html` and the `.js .animate-box` rule from `style.css`.
- Pie charts (`pieChart`, `skillsWayPoint`): no `.chart` elements exist.
- Page loader (`loaderPage`): no `.fh5co-loader` element exists.
- Full-height helper (`fullHeight`) and `isMobile` user-agent sniffing: no `.js-fullheight` element exists.
- Empty `parallax` stub.

Scripts removed from `index.html`: `jquery.min.js`, `jquery.easing.1.3.js`, `jquery.waypoints.min.js`, `jquery.easypiechart.min.js`, and the inline skill-bar and nav-shadow scripts.

Files deleted from `js/`: `jquery.min.js`, `jquery.easing.1.3.js`, `jquery.waypoints.min.js`, `jquery.easypiechart.min.js`, `jquery.stellar.min.js`, `modernizr-2.6.2.min.js`, `respond.min.js`, `bootstrap.min.js`, `google_map.js`. Their only uncommitted changes are file-mode changes, so nothing is lost.

### Icons

The 13 icons in use and their icomoon codepoints:

| Class | Codepoint | Class | Codepoint |
|---|---|---|---|
| `icon-arrow-up22` | `ebf8` | `icon-monitor` | `eaaf` |
| `icon-cloud` | `e04b` | `icon-phone3` | `eb00` |
| `icon-database` | `e992` | `icon-suitcase` | `ea20` |
| `icon-envelop` | `eb03` | `icon-twitter2` | `ea7d` |
| `icon-github2` | `ec6d` | `icon-wrench` | `eb4f` |
| `icon-graduation-cap` | `e9b1` | `icon-linkedin2` | `ea74` |
| `icon-location3` | `eb05` | | |

All 13 glyphs exist as paths in `fonts/icomoon/icomoon/fonts/icomoon.svg` (units-per-em 1024, ascent 960, descent −64).

Extraction (one-off, run during implementation, script not committed):

- For each codepoint, read the glyph's `d` path and `horiz-adv-x` width.
- Emit a `<symbol id="icon-NAME" viewBox="0 0 W 1024">` whose `<path>` carries `transform="matrix(1 0 0 -1 0 960)"`, which flips the font's y-up coordinates into SVG's y-down system with the baseline at the ascent.

Markup:

- Insert one hidden sprite, `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">…symbols…</svg>`, as the first child of `<body>`.
- Replace each of the 22 `<i class="icon-NAME"></i>` usages with `<svg class="icon" aria-hidden="true"><use href="#icon-NAME"/></svg>`.

CSS:

- Add `.icon { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; }` to `style.css`.
- Update the three rules that target `i` so they target `.icon`: `.timeline > li > .timeline-badge i`, `.contact-info li i`, `.gototop a i`. Any other selector found during implementation that targets these `<i>` elements is updated the same way.
- Delete the duplicate icomoon `@font-face` at the top of `style.css`.

Files deleted: `css/icomoon.css`, the whole `fonts/icomoon/` folder, and `fonts/bootstrap/` (nothing references it).

## 6. Loading order

`<head>` after the change, in order:

1. `meta charset`, `viewport`, `title`, description, canonical, robots, `color-scheme`, `theme-color`
2. Favicon and touch icon links
3. Open Graph and Twitter meta
4. `<link rel="preconnect" href="https://fonts.googleapis.com">`
5. `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
6. Google Fonts stylesheet `<link>` (unchanged URL)
7. `css/tailwind.css`, then `css/style.css`
8. JSON-LD
9. `<script src="js/main.js" defer></script>`

Also:

- Delete the Google Fonts `@import` at the top of `style.css`. It duplicates the `<link>` and blocks rendering until it finishes.
- Hero avatar `<img>` gains `width="460" height="460" fetchpriority="high" decoding="async"`. CSS already sets the displayed size, so these attributes only reserve space and set priority.

## 7. Intended visual differences

Everything else must match the baseline screenshots.

1. The toggle button is gone from the nav.
2. Visitors whose system is set to light mode now see the dark theme.
3. The nav and footer borders become visible (light at 8% opacity instead of invisible black).
4. Icons may differ from the font rendering by sub-pixel amounts (anti-aliasing and baseline alignment).

## 8. Risks

1. **Tailwind v3 → v4 differences.** The CDN serves v3. Differences that could matter here: v4's default border colour is `currentColor` (v3 used gray-200), which only affected the toggle that is being removed. v4 also targets browsers from about 2023 onward (Safari 16.4+, Chrome 111+). The screenshot comparison catches anything else.
2. **Cascade order changes.** The CDN injects its `<style>` at runtime, after `style.css`, so today Tailwind wins some ties. The compiled file loads first, so `style.css` wins instead. Any rule where that flips the result will show in the screenshot comparison and is fixed case by case.
3. **`duration-400` becomes active.** v3 had no `duration-400` step, so the class did nothing; v4 accepts any number. Removing it with the theme transition (§4) avoids a new body transition.
4. **SVG glyph alignment.** Font icons sit on the text baseline; SVGs sit on the box. The `vertical-align: -0.125em` default covers most cases, and screenshots catch outliers.
5. **Hook not installed on a fresh clone** until someone runs `npm install`. The hook itself refuses to commit when dependencies are missing, and a comment at the top of `src/tailwind.css` gives the setup steps (`npm install`, then `npm run build`). `README.md` is currently deleted in the working tree, so it is not used for this.

## 9. Verification

Run before implementation to record the baseline, and again after:

1. **Screenshots.** Full-page and per-section at 1440×900 and 390×844, in Playwright's Chromium. The baseline is taken with the colour scheme emulated as dark so the comparison is like for like.
2. **Lighthouse.** Mobile preset against a local static server, three runs each, median reported: Performance, Accessibility, Best Practices, LCP, CLS, TBT and total transfer size.
3. **Console.** Zero errors; no Tailwind CDN warning.
4. **Network.** No requests to `cdn.tailwindcss.com`, `js/jquery*` or icomoon fonts.
5. **Behaviour.** In the browser: go-to-top hidden at the top and shown after scrolling; clicking it returns to the top; nav gains `.scrolled`; skill bars reach their widths after scrolling to Skills.
6. **Hook.**
   - Stage an `index.html` change that adds a new utility class, commit, and confirm `css/tailwind.css` in that commit contains the class.
   - Break `src/tailwind.css` temporarily and confirm the commit is blocked.
   - Commit a change to an unrelated file and confirm the hook skips the build.

The results table (baseline versus after) goes into the final report before merging.

## 10. Rollback

All work is committed on `perf/tailwind-build`. It merges into `main` with a merge commit only after the owner approves the verification results. Undoing it later is `git revert -m 1 <merge-commit>`, which restores the CDN setup in one step.

## 11. Out of scope

Tracked for later groups:

- Mobile navigation menu (group D, item 11)
- Text labels on skill levels, skip link, other accessibility items (group D, items 13–14)
- Converting inline `style=""` attributes to Tailwind classes (group D, item 20)
- Renaming `fh5co-` section IDs (group D, item 21)
- Deleting unused template images, pages, `sass/`, `css/bootstrap.css`, `css/animate.css`, `css/flexslider.css` (group D, item 22)
- Content changes (group C)
