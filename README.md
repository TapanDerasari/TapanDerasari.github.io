# tapanderasari.github.io

Personal portfolio of Tapan Derasari, PHP Team Lead. It's a single static page served by GitHub Pages from `main`: https://tapanderasari.github.io

## Structure

| Path | What it is |
|---|---|
| `index.html` | The page |
| `css/style.css` | Hand-written styles |
| `css/tailwind.css` | Compiled Tailwind utilities (generated; don't edit) |
| `src/tailwind.css` | Tailwind source and theme tokens |
| `js/main.js` | Go-to-top button, nav shadow, skill-bar animation |
| `js/hero-orbits.js` | Orbiting skill pills and particle halo in the hero |
| `images/` | Favicon, touch icon, portfolio photo crops |
| `llms.txt`, `llms-full.txt`, `robots.txt`, `sitemap.xml` | Discoverability for search engines and AI tools |
| `tests/` | `npm test`: static checks and pre-commit hook tests |
| `docs/` | Design specs and implementation plans |

## Working on it

```bash
npm install     # installs the Tailwind CLI and enables the pre-commit hook
npm test        # runs the checks
npm run build   # rebuilds css/tailwind.css (the hook does this on commit)
```

There's no server-side build. Commit and push to `main`, and GitHub Pages publishes the files as they are. When a commit stages `index.html` or `src/tailwind.css`, the pre-commit hook rebuilds `css/tailwind.css` from the staged versions and adds it to the commit.
