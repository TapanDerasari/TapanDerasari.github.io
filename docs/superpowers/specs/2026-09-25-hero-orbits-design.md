# Hero Orbit System — Design

**Date:** 2026-09-25
**Status:** Approved by the owner after a side-by-side demo ("demo 1 looks good to me. make it.")
**Branch:** `feat/hero-orbits`

## Brief

- Keep the photo at the centre of the hero composition.
- Turn the six skill pills into 3D-looking objects that slowly orbit on elliptical paths at different depths.
- Add a faint particle field of small glowing dots that forms a soft halo or constellation around the composition.
- Add gentle mouse parallax: the orbits and particles shift slightly with the cursor.
- On scroll, the system flattens and recedes so it doesn't compete with the content below.

## Approach chosen: CSS 3D-style transforms + one 2D canvas (no library)

Two throwaway demos were built as copies of the real page and measured with Lighthouse (one run each, local server, mobile preset):

| | Approach 1: CSS + canvas | Approach 2: Three.js WebGL |
|---|---|---|
| Added JS (gzipped) | 1.9 KB (demo) / 3.1 KB (production, unminified) | 139.5 KB |
| Lighthouse Performance | 99 | 52 (partly because the local server doesn't compress) |
| Total Blocking Time | 0 ms | 1,077 ms |
| Visual result | Near-identical | Near-identical |

Approach 1 delivers the whole brief without a 3D engine. The pills are flat labels, so depth is conveyed by moving each pill along an ellipse and varying its scale, opacity and layering.

## Design

- **Markup:** the photo and pills sit in `<div class="orbit-system">` inside `.hero-visual`.
- **`js/hero-orbits.js`** (deferred):
  - Adds `.orbits-on` to `.hero-visual`, inserts a `<canvas class="orbit-particles" aria-hidden="true">`, and positions each pill every frame.
  - **Orbits:** three orbits, two pills each (periods 46 s, 64 s and 82 s; tipped 26°, 20° and 30° toward the viewer; tilted −16°, 12° and 3°). Each orbit's radius is the photo radius plus 80 px on desktop or 48 px on mobile, times 1.0, 1.2 or 1.4. Front-passing pills cross the chest, not the face.
  - **Depth:** a 900 px perspective scale; opacity runs from 0.4 behind to 1.0 in front; `z-index` is 1 behind the photo and 3 in front.
  - **Particles:** 120 on desktop, 70 on mobile or touch; slow drift and twinkle; faint constellation lines between near neighbours.
  - **Parallax:** only with a fine pointer; eased; nearer pills and dots move more.
  - **Scroll:** over the first 70% of the hero's height, the orbits close to edge-on, and the system scales to 0.8, moves down 40 px and fades to 25%.
  - **Narrow screens:** orbits are slimmed horizontally (`xFit`) so no pill leaves the screen.
  - **Efficiency:** pauses when the hero is off screen or the tab is hidden.
- **Fallbacks:**
  - **No JavaScript:** `.orbits-on` never applies, so the original static pill positions and float animation stay.
  - **`prefers-reduced-motion`:** one still frame of the orbit layout, with no animation, parallax or scroll effect.
- **CSS (`css/style.css`):** `.orbit-system` fills `.hero-visual`. `.orbits-on .hero-badge` centres the pills and disables the float animation. `.orbit-particles` sits behind everything.

## Verification

- **`npm test`:** 27/27, including new checks for the wrapper markup, the scoped CSS fallback, and the script's motion, pointer and visibility guards.
- **Browser checks:**
  - Pills move over time, and freeze when the hero is off screen.
  - The reduced-motion layout is placed and still.
  - With JavaScript off, the static pills are all visible.
  - No horizontal overflow at 390 px.
  - At 390 px, 0 of 240 samples had a pill off screen, down from 72 before the `xFit` fix.
  - Scrolling fades and shrinks the system.
  - 0 console errors.
- **Lighthouse (median of 3):** Performance 99, Total Blocking Time 0 ms, CLS 0, LCP 1.6 s, 197 KB transferred.
