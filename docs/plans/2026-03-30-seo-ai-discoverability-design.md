# SEO & AI Discoverability Design

**Date:** 2026-03-30
**Goal:** Improve discoverability for both name-based searches ("Tapan Derasari") and role-based searches ("PHP Team Lead Ahmedabad", "Laravel Developer India"), plus AI tool discoverability via llms.txt.
**Approach:** On-Page SEO + AI Discoverability (Approach B+). Tailwind CDN retained as-is.

---

## 1. `<head>` Meta & Structured Data

### Fixes
- Add `lang="en"` to `<html>` element
- Fix `og:image` — replace placeholder `URL_of_your_profile_picture_or_logo` with `https://avatars.githubusercontent.com/u/41634687`
- Add `<link rel="canonical" href="https://tapanderasari.github.io/">`
- Add `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">`
- Update `<title>` to: `Tapan Derasari — PHP Team Lead | Laravel Developer | Ahmedabad`

### New Tags
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:description" content="PHP Team Lead with 7+ years in Laravel, Vue.js & Node.js. Open to opportunities from Ahmedabad, India.">
```

### JSON-LD Structured Data (Person schema)
Add a `<script type="application/ld+json">` block in `<head>`:
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Tapan Derasari",
  "jobTitle": "PHP Team Lead",
  "description": "PHP Team Lead with 7+ years of experience in Laravel, Vue.js, and Node.js. Based in Ahmedabad, India.",
  "url": "https://tapanderasari.github.io",
  "image": "https://avatars.githubusercontent.com/u/41634687",
  "email": "tapanderasari89@gmail.com",
  "telephone": "+918128884440",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Ahmedabad",
    "addressRegion": "Gujarat",
    "addressCountry": "IN"
  },
  "worksFor": {
    "@type": "Organization",
    "name": "TOPS Infosolutions Pvt. Ltd."
  },
  "sameAs": [
    "https://github.com/TapanDerasari",
    "https://in.linkedin.com/in/tapan-derasari-68a203115",
    "https://x.com/TDerasari"
  ],
  "knowsAbout": ["PHP", "Laravel", "Vue.js", "Nuxt.js", "Node.js", "MySQL", "PostgreSQL", "AWS Lambda", "Docker", "Redis", "REST APIs", "Team Leadership"]
}
```

---

## 2. Semantic HTML

Replace generic `<div>` wrappers with semantic elements throughout `index.html`:

| Current | Replace With |
|---|---|
| `<div id="fh5co-about">` | `<section id="fh5co-about" aria-label="About Tapan Derasari">` |
| `<div id="fh5co-resume">` | `<section id="fh5co-resume" aria-label="Work Experience and Education">` |
| `<div id="fh5co-skills">` | `<section id="fh5co-skills" aria-label="Technical Skills">` |
| `<div id="fh5co-projects">` | `<section id="fh5co-projects" aria-label="Projects">` |
| `<div id="fh5co-contact">` | `<section id="fh5co-contact" aria-label="Contact">` |
| Project card `<div class="project-card">` | `<article class="project-card">` |

Additional changes:
- Wrap all sections in `<main>` element
- Add `<time datetime="YYYY-MM">` around job date spans (e.g. `<time datetime="2025-10">Oct 2025</time>`)
- The `<h2>` inside the About section bio (`Hello, I'm Tapan!`) should be `<h3>` to preserve heading hierarchy under the single `<h1>`

---

## 3. Supporting Files

### `robots.txt`
```
User-agent: *
Allow: /

# AI crawlers explicitly allowed
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: anthropic-ai
Allow: /

Sitemap: https://tapanderasari.github.io/sitemap.xml
```

### `sitemap.xml`
Single URL entry for the one-page site:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://tapanderasari.github.io/</loc>
    <lastmod>2026-03-30</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

### `.nojekyll`
Empty file at repo root. Prevents GitHub Pages from running Jekyll processing which can break some asset paths.

### `llms.txt`
Structured markdown following the llms.txt spec for AI tool discoverability:
```markdown
# Tapan Derasari

> PHP Team Lead with 7+ years of experience. Based in Ahmedabad, India.

Tapan Derasari is a PHP Team Lead at TOPS Infosolutions Pvt. Ltd., specializing in Laravel-based web applications, team leadership, and client communication.

## Skills
- Backend: PHP, Laravel, MySQL, PostgreSQL, REST APIs, Node.js
- Frontend: Vue.js, Nuxt.js, HTML5, CSS3, jQuery, Tailwind CSS
- Cloud & DevOps: AWS Lambda, AWS Amplify, Docker, CI/CD
- Tools: Git, Redis, Composer, Postman, NPM

## Experience
- PHP Team Lead, TOPS Infosolutions (Oct 2025 – Present)
- Sr Software Engineer, TOPS Infosolutions (Jan 2023 – Jan 2026)
- Laravel Developer, TOPS Infosolutions (Mar 2019 – Feb 2023)
- Laravel Developer, Inbound WebHub (Aug 2018 – Feb 2019)

## Education
- Bachelor's Degree (Gold Medalist), College of Agricultural Information Technology, Anand Agricultural University (2014–2018)

## Contact
- Email: tapanderasari89@gmail.com
- Phone: +91 8128884440
- Location: Ahmedabad, Gujarat, India
- GitHub: https://github.com/TapanDerasari
- LinkedIn: https://in.linkedin.com/in/tapan-derasari-68a203115
- Twitter/X: https://x.com/TDerasari
- Portfolio: https://tapanderasari.github.io
```

### `llms-full.txt`
Extended version of `llms.txt` including:
- Full project descriptions with tech stacks
- Detailed bullet points from each role
- All skills with proficiency levels

---

## 4. Content & Keyword Optimization

### Title tag
`Tapan Derasari — PHP Team Lead | Laravel Developer | Ahmedabad`

### About section bio
Naturally weave in target keywords once each:
- "Laravel Developer in India"
- "PHP Team Lead Ahmedabad"

### Meta description
Keep current description but tighten to under 160 characters:
> `PHP Team Lead & Laravel Developer in Ahmedabad with 7+ years building scalable web apps. Open to freelance and full-time opportunities.`

---

## Files to Create/Modify

| File | Action |
|---|---|
| `index.html` | Modify — meta tags, JSON-LD, semantic HTML, heading fix, time elements |
| `robots.txt` | Create |
| `sitemap.xml` | Create |
| `.nojekyll` | Create |
| `llms.txt` | Create |
| `llms-full.txt` | Create |
