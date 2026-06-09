# KXD Asset Preservation Report

**Audit date:** June 2026  
**Source:** kreatebydesign.com (crawled)  
**Destination:** `public/migrated-assets/`

---

## 1. Summary

| Category | Preserved | Failed / skipped | Notes |
|----------|-----------|------------------|-------|
| Brand | 2 | 0 | Logo + OG image |
| Favicons | 5 | 0 | Full favicon set |
| Textures | 4 | 0 | Hero + about backgrounds |
| Projects | 10 | 0 | Homepage + case study imagery |
| Logos (clients) | 20 | 0 | SVG client wall |
| Founder | 1 | 1 excluded | Matt only — Ben Fier excluded |
| Partners (tech) | 0 | 7 | Not statically hosted — see §6 |

**Total files preserved:** 42

---

## 2. Preserved Assets (by folder)

### `brand/`

| File | Source | Size (approx) | Use |
|------|--------|---------------|-----|
| `kxd-logo-transparent.png` | `/kxd_logo_transparent_edited.png` | ~40KB | Header, footer, admin |
| `kxd-og-image.png` | Vercel blob `kxd-og-image-4aa00883.png` | ~256KB | Default OG/Twitter card |

### `favicons/`

| File | Source |
|------|--------|
| `favicon.ico` | `/favicon.ico` |
| `favicon-16x16.png` | `/favicons/favicon-16x16.png` |
| `favicon-32x32.png` | `/favicons/favicon-32x32.png` |
| `favicon-48x48.png` | `/favicons/favicon-48x48.png` |
| `apple-touch-icon.png` | `/favicons/apple-touch-icon.png` |

### `textures/`

| File | Source | Use |
|------|--------|-----|
| `hero-bg.jpg` | Vercel blob `hero-bg-d0ff5806.jpg` | Homepage hero silk/fabric background |
| `about-opener-bg.jpg` | `/about-opener-bg.jpg` | About hero frequency-line texture |
| `mission-bg.jpg` | `/mission-bg.jpg` | About mission section atmosphere |
| `vision-bg.jpg` | `/vision-bg.jpg` | About vision architectural render |

### `founder/`

| File | Source | Use |
|------|--------|-----|
| `matt-lunger.jpg` | Vercel blob `matt-d0ff5806.jpg` | Founder section, About page |

### `projects/`

| File | Source | Project |
|------|--------|---------|
| `cusick-morgan.jpg` | blob `cusick-morgan-d0ff5806.jpg` | Cusick Morgan — homepage card |
| `cusick-morgan-showcase-1.png` | blob `cusick-1-d0ff5806.png` | Cusick Morgan — case study mockup |
| `cusick-morgan-showcase-2.png` | blob `cusick-2-d0ff5806.png` | Cusick Morgan — case study mockup |
| `cusick-morgan-showcase-3.png` | blob `cusick-3-d0ff5806.png` | Cusick Morgan — case study mockup |
| `otp.jpg` | blob `otp-d0ff5806.jpg` | OTP — homepage card |
| `sbe.jpg` | blob `sbe-d0ff5806.jpg` | SBE — homepage card |
| `hair-mafia.jpg` | blob `hair-mafia-d0ff5806.jpg` | Hair Mafia — homepage card |
| `primal-motorsports.jpg` | blob `primal-motorsports-e63a0820.jpg` | Primal — homepage card |
| `primal-motorsports-hero.jpg` | blob `hero-e63a0820.jpg` | Primal — case study hero |
| `otp-golfcarts.jpg` | blob `otp-golfcarts-e63a0820.jpg` | OTP Golfcarts — homepage card |

### `logos/` (client wall — 20 SVGs)

`10-summer`, `bobby-q`, `cusick-morgan`, `dialed-in-electric`, `dj`, `dv8`, `gaya-palmer`, `golden-state`, `hair-mafia`, `indivisible`, `james-kali`, `lalola`, `leadsrabbit`, `life-insurance`, `otp`, `plate-the-umpqua`, `primal`, `rdbla`, `sbe`, `shvo`, `the-democratic`

---

## 3. Intentionally Excluded

| Asset | Reason |
|-------|--------|
| `ben-d0ff5806.jpg` | Ben Fier reference — per business direction |
| Fier Media branding | Outdated team structure |
| Old service imagery tied to deprecated positioning | Replaced by new service architecture |
| Live site tech stack badges on case studies | Next.js, Tailwind, Framer Motion, Vercel pills — do not migrate; outcome-focused copy replaces |

---

## 4. Not Available on Live Site (cannot auto-preserve)

| Asset needed | Status | Recommended action |
|--------------|--------|-------------------|
| **Plate the Umpqua** project imagery | No `/projects/plate-the-umpqua` page (404) | Only logo SVG preserved. Source photography from client files or new capture. |
| **AutoDV8ions** project imagery | No project page (404) | No homepage card on current live site. Source from client workspace. |
| **Plate the Umpqua** case study content | Not published | Write new case study in Payload during content phase. |
| **AutoDV8ions** case study content | Not published | Write new case study in Payload during content phase. |
| **Primal Motorsports** showcase screenshots | Only hero + card image | Capture from live primal site or client assets for browser mockup section. |
| **Google Reviews** data | Not on live site | Future GBP sync into Payload `reviews` collection. |
| **Technology partner logos** | Rendered inline (Supabase, Vercel, Figma, Cursor, Shopify, Anthropic, AWS) — not at static `/partners/` paths | Download from official brand kits or recreate monochrome SVGs manually. |
| **Service card icons** | Inline SVG/component | Recreate as KXD gold line-art icons matching live style. |
| **Hero diamond flourish** | CSS/SVG component | Recreate from screenshot reference in design system. |
| **Team member photos** (beyond Matt) | Ben excluded; no other team portraits confirmed | Matt-only founder positioning for v1. |
| **Video assets** | None found on crawl | N/A |

---

## 5. Reference Screenshots (already in repo)

16 screenshots in `public/reference/live-site/` — primary design audit source. These are **not** production assets but design authority references:

| File | Documents |
|------|-----------|
| `01-home-hero.png` | Hero composition |
| `02-home-services.png` / `02-home-services-2.png` | Services grid |
| `03-home-case-studies.png` | Case masonry grid |
| `04-home-client-logos.png` / `04-home-client-logos-2.png` | Client logo wall |
| `05-home-cta-footer.png` | Final CTA band |
| `06-case-study-hero.png` | Case study hero |
| `07-case-study-details.png` | Metadata cards |
| `08-case-study-testimonial.png` | Client feedback |
| `09-case-study-showcase.png` | Browser mockup |
| `10-case-study-related-projects.png` | Related projects |
| `11-about-hero.png` through `15-about-team.png` | About page |
| `16-contact-page.png` | Contact form |
| `06-footer.png` | Footer structure |

---

## 6. Technology Partner Logos

Observed on live homepage (monochrome white treatment):

- Supabase
- Vercel
- Figma
- Cursor
- Shopify
- Anthropic
- AWS

**Status:** Not available as static files on the live domain. Component-rendered.

**Action required:** Manually source official SVG/wordmarks, convert to monochrome white, store in `public/migrated-assets/partners/` during page build phase.

---

## 7. Vercel Blob Dependency

Most project and founder photography is hosted on:

```
https://75yengj0urf25d5k.public.blob.vercel-storage.com/
```

All critical homepage imagery has been **downloaded locally**. The rebuild must not depend on this external blob remaining available after the live site is decommissioned.

---

## 8. Migration Checklist (next phase)

- [ ] Optimize preserved JPGs → WebP/AVIF in `public/media/`
- [ ] Import client logos into Payload `partners` collection
- [ ] Import project images into Payload `media` collection
- [ ] Source Plate the Umpqua photography
- [ ] Source AutoDV8ions photography
- [ ] Capture Primal showcase screenshots for case study mockup
- [ ] Source technology partner SVGs
- [ ] Recreate hero diamond + service icons as SVG components
- [ ] Verify rights to all client logos before publication

---

## 9. File Integrity

All 42 preserved files downloaded successfully with non-zero file sizes. No corrupt downloads detected during audit.

---

*Asset preservation complete for available static assets. Manual sourcing required for items in §4 before flagship case studies launch.*
