# Design: Profile Update — PHP Team Lead + Contact Form Removal

**Date:** 2026-03-24
**Approach:** B — Content update + contact section rework
**Stack:** Plain HTML + Tailwind CSS (CDN) + custom CSS in style.css

---

## 1. Scope

Update Tapan Derasari's portfolio (`index.html`) to reflect his current LinkedIn profile as PHP Team Lead at TOPS Infosolutions, and remove the contact form, replacing it with a clean centered contact info block.

---

## 2. Global Title & Meta

- `<title>`: "Tapan Derasari — PHP Team Lead"
- Meta `description`: 7+ years, PHP Team Lead, team management & client communication
- OG title / Twitter title: "Tapan Derasari — PHP Team Lead"

---

## 3. Hero Section

| Element | Current | New |
|---|---|---|
| `<h3>` subtitle | Senior PHP Laravel Developer | PHP Team Lead |
| Descriptor line | 6+ years building scalable web apps… | 7+ years · Team Lead · Laravel · Vue.js · Ahmedabad, India |
| Hero CTA "Contact Me" | scrolls to #fh5co-contact | keep (scrolls to contact info block) |

---

## 4. About Section

**Bio replacement:**
> "I'm Tapan Derasari, a PHP Team Lead at TOPS Infosolutions, Ahmedabad. With 7+ years of experience in web application development, I specialize in Laravel-based projects with a strong focus on team management and client communication. I lead teams working across Node.js, React.js, Vue.js/Nuxt.js, AWS services, GIS, and Laravel. Passionate about clean architecture, mentoring developers, and delivering solutions that matter."

---

## 5. Experience Timeline

Four roles, matching LinkedIn exactly:

1. **PHP Team Lead** — TOPS Infosolutions · Oct 2025–Present
   *Working and managing teams across Node.js, React.js, AWS services, GIS, and Laravel*

2. **Sr Software Engineer** — TOPS Infosolutions · Jan 2023–Jan 2026
   *(existing bullet points retained, title updated)*

3. **Laravel Developer** — TOPS Infosolutions · Mar 2019–Feb 2023
   *(existing bullet points retained, dates corrected)*

4. **Laravel Developer** — Inbound WebHub · Aug 2018–Feb 2019
   *(unchanged)*

---

## 6. Contact Section Redesign

### Remove
- The entire `<form>` element and its JS handler (`handleContactForm`)
- The two-column `contact-grid` layout

### Replace with
A **single centered block** using Tailwind:
- Max-width container, centered
- Intro text: *"Have a project in mind or want to discuss opportunities? Reach out directly."*
- Three info rows (icon + text): Phone, Email, Location — using existing `.contact-info` styles
- Social buttons row: GitHub, LinkedIn, Twitter
- Clean card treatment: subtle background, rounded, shadow — consistent with existing card styles

### Nav
- Remove `<a href="#fh5co-contact">Contact</a>` nav link
- The section `id="fh5co-contact"` remains so hero CTA scroll still works

---

## 7. Footer

- Update tagline: "PHP Team Lead · Open to Opportunities"

---

## 8. Tailwind Approach

- All new markup uses Tailwind utility classes consistent with existing patterns in `index.html`
- No new CSS classes added to `style.css` — leverage existing `.contact-info`, `.social-btn`, `.section-label`, `.section-title`
- The centered contact block uses: `max-w-lg mx-auto text-center`, card uses `rounded-2xl shadow-md p-8`

---

## 9. Out of Scope

- No new skills added (React.js deferred — skills section not requested)
- No visual/theme changes
- No new pages or files

---

## 10. Files Changed

- `index.html` — all changes contained here
