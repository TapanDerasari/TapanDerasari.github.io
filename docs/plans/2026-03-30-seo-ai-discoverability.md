# SEO & AI Discoverability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve discoverability for name-based and role-based searches, plus AI tool discoverability via llms.txt.

**Architecture:** All changes are in-place edits to the single `index.html` file plus creation of 5 new static files (`robots.txt`, `sitemap.xml`, `.nojekyll`, `llms.txt`, `llms-full.txt`). No build tooling changes. Tailwind CDN stays as-is.

**Tech Stack:** Plain HTML, JSON-LD (Schema.org), llms.txt spec, XML sitemap spec.

**Design doc:** `docs/plans/2026-03-30-seo-ai-discoverability-design.md`

---

### Task 1: Fix `<html>` and `<head>` meta tags

**Files:**
- Modify: `index.html` (lines 2–28)

**Step 1: Add `lang="en"` to `<html>` tag**

Change:
```html
<html>
```
To:
```html
<html lang="en">
```

**Step 2: Update `<title>` tag**

Change:
```html
<title>Tapan Derasari &mdash; PHP Team Lead</title>
```
To:
```html
<title>Tapan Derasari — PHP Team Lead | Laravel Developer | Ahmedabad</title>
```

**Step 3: Update `<meta name="description">`**

Change to (under 160 chars):
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="PHP Team Lead &amp; Laravel Developer in Ahmedabad with 7+ years building scalable web apps. Open to freelance and full-time opportunities."/>
```

**Step 4: Add canonical and robots tags** — after the `<meta name="author">` line:
```html
<link rel="canonical" href="https://tapanderasari.github.io/">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
```

**Step 5: Verify in browser**

Open `index.html` in browser → View Source → confirm `<html lang="en">` and new title appear.

**Step 6: Commit**
```bash
git add index.html
git commit -m "seo: fix html lang, title, description, canonical"
```

---

### Task 2: Fix Open Graph & Twitter Card tags

**Files:**
- Modify: `index.html` (lines 17–27)

**Step 1: Fix `og:image` placeholder**

Change:
```html
<meta property="og:image" content="URL_of_your_profile_picture_or_logo"/>
```
To:
```html
<meta property="og:image" content="https://avatars.githubusercontent.com/u/41634687"/>
<meta property="og:type" content="website"/>
```

**Step 2: Add missing Twitter Card tags**

After the existing Twitter tags, add:
```html
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:description" content="PHP Team Lead with 7+ years in Laravel, Vue.js &amp; Node.js. Open to opportunities from Ahmedabad, India."/>
```

**Step 3: Verify OG tags**

Use Facebook's Sharing Debugger or paste the URL into a social preview tool to confirm image and description render correctly.

**Step 4: Commit**
```bash
git add index.html
git commit -m "seo: fix og:image placeholder, add twitter card meta tags"
```

---

### Task 3: Add JSON-LD Person structured data

**Files:**
- Modify: `index.html` — add `<script type="application/ld+json">` block inside `<head>`, just before `</head>`

**Step 1: Add the JSON-LD block**

```html
<script type="application/ld+json">
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
  "knowsAbout": [
    "PHP", "Laravel", "Vue.js", "Nuxt.js", "Node.js",
    "MySQL", "PostgreSQL", "AWS Lambda", "Docker",
    "Redis", "REST APIs", "Team Leadership"
  ]
}
</script>
```

**Step 2: Validate structured data**

Go to https://validator.schema.org and paste the JSON-LD to confirm it parses with no errors.

**Step 3: Commit**
```bash
git add index.html
git commit -m "seo: add JSON-LD Person structured data schema"
```

---

### Task 4: Improve semantic HTML structure

**Files:**
- Modify: `index.html` — section wrappers, `<main>`, project cards, heading levels, date elements

**Step 1: Wrap all sections in `<main>`**

Add `<main>` immediately after the closing `</header>` tag and close it before the footer:
```html
</header>
<main>
  <!-- all sections go here -->
</main>
<footer ...>
```

**Step 2: Convert section divs to `<section>` elements**

Replace each section wrapper:
```html
<!-- FROM -->
<div id="fh5co-about" class="animate-box">
<!-- TO -->
<section id="fh5co-about" class="animate-box" aria-label="About Tapan Derasari">
```

Apply the same pattern for:
- `#fh5co-resume` → `aria-label="Work Experience and Education"`
- `#fh5co-skills` → `aria-label="Technical Skills"`
- `#fh5co-projects` → `aria-label="Projects"`
- `#fh5co-contact` → `aria-label="Contact"`

**Step 3: Fix heading hierarchy in About section**

The bio heading is `<h2>` but it's a sibling of another `<h2>` (section title). Change it to `<h3>`:
```html
<!-- FROM -->
<h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary);">Hello, I'm Tapan!</h2>
<!-- TO -->
<h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary);">Hello, I'm Tapan!</h3>
```

**Step 4: Wrap project cards in `<article>`**

```html
<!-- FROM -->
<div class="project-card">
<!-- TO -->
<article class="project-card">
```
(Close with `</article>` accordingly — 3 project cards total)

**Step 5: Add `<time>` elements to job dates**

Wrap each company date span content:
```html
<!-- Example: PHP Team Lead -->
<span class="company">TOPS Infosolutions Pvt. Ltd. &mdash; <time datetime="2025-10">Oct 2025</time> &ndash; Present</span>

<!-- Sr Software Engineer -->
<span class="company">TOPS Infosolutions Pvt. Ltd. &mdash; <time datetime="2023-01">Jan 2023</time> &ndash; <time datetime="2026-01">Jan 2026</time></span>

<!-- Laravel Developer (TOPS) -->
<span class="company">TOPS Infosolutions Pvt. Ltd. &mdash; <time datetime="2019-03">Mar 2019</time> &ndash; <time datetime="2023-02">Feb 2023</time></span>

<!-- Laravel Developer (Inbound) -->
<span class="company">Inbound WebHub &mdash; <time datetime="2018-08">Aug 2018</time> &ndash; <time datetime="2019-02">Feb 2019</time></span>
```

**Step 6: Weave in target keywords naturally in About bio**

In the first paragraph of the bio, update to naturally include "Laravel Developer in India" and "PHP Team Lead Ahmedabad":
```html
<p>I'm a PHP Team Lead at TOPS Infosolutions, Ahmedabad — one of India's leading IT firms. With 7+ years as a Laravel Developer in India, I specialize in scalable web application development with a strong focus on team management and client communication.</p>
```

**Step 7: Commit**
```bash
git add index.html
git commit -m "seo: semantic HTML - main, sections, articles, time elements, keyword copy"
```

---

### Task 5: Create `robots.txt`

**Files:**
- Create: `robots.txt` at repo root

**Step 1: Create the file**

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

User-agent: cohere-ai
Allow: /

Sitemap: https://tapanderasari.github.io/sitemap.xml
```

**Step 2: Verify**

Open `https://tapanderasari.github.io/robots.txt` after deploying (or locally at the file path) to confirm content renders as plain text.

**Step 3: Commit**
```bash
git add robots.txt
git commit -m "seo: add robots.txt with explicit AI crawler permissions"
```

---

### Task 6: Create `sitemap.xml`

**Files:**
- Create: `sitemap.xml` at repo root

**Step 1: Create the file**

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

**Step 2: Validate**

Paste content at https://www.xml-sitemaps.com/validate-xml-sitemap.html to confirm valid XML.

**Step 3: Commit**
```bash
git add sitemap.xml
git commit -m "seo: add XML sitemap"
```

---

### Task 7: Create `.nojekyll`

**Files:**
- Create: `.nojekyll` at repo root (empty file)

**Step 1: Create the file**

Empty file — no content needed.

**Step 2: Commit**
```bash
git add .nojekyll
git commit -m "chore: add .nojekyll for GitHub Pages"
```

---

### Task 8: Create `llms.txt`

**Files:**
- Create: `llms.txt` at repo root

**Step 1: Create the file**

```markdown
# Tapan Derasari

> PHP Team Lead with 7+ years of experience building scalable web applications. Based in Ahmedabad, India. Open to freelance and full-time opportunities.

## About

Tapan Derasari is a PHP Team Lead at TOPS Infosolutions Pvt. Ltd., one of India's leading IT firms. He specializes in Laravel-based web application development with a strong focus on team leadership, architecture decisions, and client communication. He has attended Laracon India and is active in the Laravel ecosystem.

## Skills

- Backend: PHP (Expert), Laravel (Expert), MySQL (Advanced), REST APIs (Advanced), Node.js (Intermediate), PostgreSQL (Intermediate)
- Frontend: HTML5 (Expert), CSS3 (Expert), jQuery (Advanced), Vue.js (Intermediate), Nuxt.js (Intermediate), Tailwind CSS (Intermediate)
- Cloud & DevOps: AWS Lambda (Intermediate), AWS Amplify (Intermediate), Docker (Intermediate), CI/CD (Beginner)
- Tools: Git (Expert), Composer (Advanced), Postman (Advanced), Redis (Intermediate), NPM (Intermediate)

## Work Experience

### PHP Team Lead — TOPS Infosolutions Pvt. Ltd. (Oct 2025 – Present)
- Leading and managing cross-functional teams across Node.js, React.js, AWS services, GIS, and Laravel
- Driving project architecture decisions and conducting code reviews
- Managing client communication, task allocation, and resource planning
- Mentoring developers and fostering team growth

### Sr Software Engineer — TOPS Infosolutions Pvt. Ltd. (Jan 2023 – Jan 2026)
- Led backend architecture for 5+ enterprise Laravel applications
- Implemented AWS Lambda microservices, reducing server costs
- Developed multi-tenant SaaS platforms using Laravel + Vue.js/Nuxt.js
- Built RESTful APIs consumed by mobile and web clients

### Laravel Developer — TOPS Infosolutions Pvt. Ltd. (Mar 2019 – Feb 2023)
- Developed multi-tenant SaaS platforms using Laravel + Vue.js
- Integrated payment gateways (Stripe, Razorpay)
- Built automated testing pipelines and CI/CD workflows

### Laravel Developer — Inbound WebHub (Aug 2018 – Feb 2019)
- Developed custom CMS and e-commerce solutions
- Worked with jQuery and Bootstrap frontend stacks

## Education

Bachelor's Degree (Gold Medalist) — College of Agricultural Information Technology, Anand Agricultural University (2014–2018)

## Notable Projects

- **Multi-Tenant SaaS Platform**: White-label SaaS serving 50+ clients with tenant isolation, custom domains, and RBAC. Built with Laravel, MySQL, Vue.js.
- **REST API Gateway**: Centralized API gateway for mobile apps with JWT auth, rate limiting, and Swagger docs. Built with Laravel Sanctum, Redis, AWS.
- **Serverless Event Processor**: Event-driven system processing 100k+ daily webhook events via AWS Lambda, Node.js, SQS.

## Contact

- Email: tapanderasari89@gmail.com
- Phone: +91 8128884440
- Location: Ahmedabad, Gujarat, India
- Portfolio: https://tapanderasari.github.io
- GitHub: https://github.com/TapanDerasari
- LinkedIn: https://in.linkedin.com/in/tapan-derasari-68a203115
- Twitter/X: https://x.com/TDerasari
```

**Step 2: Commit**
```bash
git add llms.txt
git commit -m "seo: add llms.txt for AI tool discoverability"
```

---

### Task 9: Create `llms-full.txt`

**Files:**
- Create: `llms-full.txt` at repo root

**Step 1: Create the file**

`llms-full.txt` is the extended version — copy all content from `llms.txt` and expand with:

1. Add a `## Full Skills Detail` section with proficiency explanations:
```markdown
## Full Skills Detail

**Expert (5+ years daily use):** PHP, Laravel, HTML5, CSS3, Git
**Advanced (3–5 years, production use):** MySQL, REST API Design, jQuery, Composer, Postman
**Intermediate (1–3 years, project use):** Node.js, PostgreSQL, Vue.js, Nuxt.js, Tailwind CSS, AWS Lambda, AWS Amplify, Docker, Redis, NPM
**Beginner (learning/exposure):** CI/CD pipelines
```

2. Expand each project with full technical detail:
```markdown
### Multi-Tenant SaaS Platform (Full Detail)
Built a white-label SaaS platform serving 50+ clients. Architected a multi-database strategy where each tenant gets an isolated database. Implemented automated provisioning pipeline for new tenant onboarding, custom domain routing, and role-based access control (RBAC) with granular permissions. Tech: Laravel 10, MySQL, Vue.js 3, Laravel Tenancy package.

### REST API Gateway (Full Detail)
Designed and implemented a centralized API gateway as the single entry point for all mobile app clients. Features include: JWT authentication via Laravel Sanctum, per-client rate limiting backed by Redis, request/response logging, and auto-generated Swagger/OpenAPI documentation. Deployed on AWS EC2 with RDS MySQL.

### Serverless Event Processor (Full Detail)
Architected an event-driven webhook processing system. Incoming webhooks from third-party services are queued in AWS SQS and processed by AWS Lambda functions written in Node.js. Processes 100,000+ events daily with zero server maintenance, automatic scaling, and dead-letter queue handling for failed events.
```

**Step 2: Commit**
```bash
git add llms-full.txt
git commit -m "seo: add llms-full.txt with extended AI-readable content"
```

---

### Task 10: Final verification

**Step 1: Check all files exist**
```bash
ls -la robots.txt sitemap.xml .nojekyll llms.txt llms-full.txt
```
Expected: all 5 files present.

**Step 2: Validate HTML structure**

Open `index.html` in browser → DevTools → Elements. Confirm:
- `<html lang="en">` at root
- `<main>` wrapping all sections
- All section divs are now `<section>` elements
- Project cards are `<article>` elements
- Single `<h1>` exists
- No `<h2>` appears before the section `<h2>` headings

**Step 3: Validate JSON-LD**

Copy the JSON-LD block from `index.html` and paste into https://validator.schema.org — confirm 0 errors.

**Step 4: Check page title and meta in browser**

Open DevTools → Elements → `<head>`. Confirm:
- Title is `Tapan Derasari — PHP Team Lead | Laravel Developer | Ahmedabad`
- `og:image` is the GitHub avatar URL (not the placeholder)
- `twitter:card` is `summary_large_image`
- `canonical` points to `https://tapanderasari.github.io/`

**Step 5: Final commit (if any cleanup needed)**
```bash
git add -A
git commit -m "seo: final verification cleanup"
```
