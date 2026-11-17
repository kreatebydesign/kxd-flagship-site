# KXD Signature Experience

**Status:** Permanent product standard (Edition 1)  
**Scope:** All KXD OS **client portals** (`/portal/*` client HQ / CES dashboards)  
**Out of scope:** Founder/admin operations, staff dashboards, KXD Network partner portal

---

## Purpose

The KXD Signature Experience is the official opening moment for every client portal. It communicates craftsmanship before the client’s own branded dashboard appears. **Build once. Maintain once. Deliver everywhere.**

---

## Official assets and copy

| Item | Value |
|------|--------|
| Internal name | KXD Signature Experience |
| Headline (intro) | **Exceptional by Design.** |
| Attribution | **Designed & Developed by Kreate by Design** |
| Attribution URL | https://www.kreatebydesign.com |
| Logo (only) | `public/migrated-assets/brand/kxd-logo-transparent.png` |

Never redraw, recolor, or substitute the logo.

---

## Brand colors (intro only)

| Token | Value |
|-------|--------|
| Canvas | `#030304` |
| Metallic gold | `#c2aa72` (aligned to logo) |
| Warm white (type) | `#f4f0e8` |

Client theme variables must **not** alter the introduction. After dissolve, the client dashboard uses its own CES profile tokens.

---

## Animation timeline (~2.5s)

| Stage | Time (ms) | Content |
|-------|-----------|---------|
| 1 — Line | 0–400 | Near-black field; subtle gold line emerges |
| 2 — Logo | 400–1,100 | Official gold monogram, scale + metallic sheen |
| 3 — Copy | 1,000–1,900 | Headline + attribution, staggered fade |
| 4 — Dissolve | 1,900–2,500 | Full overlay fades; dashboard visible |

Timing constants: `lib/ces/portal/brand-signature.ts` (`KXD_SIGNATURE_STAGE`).

---

## Session behavior

- **Once per client, per browser tab:** `sessionStorage` key `kxd-signature-experience-v2:c{clientId}`.
- **Account switch:** New `clientId` → eligible intro again; prevents flashing the prior client’s chrome.
- **Refresh (same tab, same client):** No replay.
- **Reduced motion:** Skip animation; mark seen immediately.
- **Failsafe:** Forced release at duration + 800ms so users are never trapped.
- **Operator preview:** Disabled (no intro, no arming script).

---

## First-paint / no dashboard flash

1. **Arming script** in `app/(portal)/portal/(app)/layout.tsx` sets `html[data-kxd-signature="arming"]` before paint when intro will play.
2. CSS hides `.kxd-os-shell--app` while arming.
3. **Experience component** in `ClientHqShell` runs the overlay; clears veil on complete.

---

## Shared architecture

| Piece | Location |
|-------|----------|
| Copy, colors, timing | `lib/ces/portal/brand-signature.ts` |
| Session helpers | `lib/ces/portal/signature-session.ts` |
| Experience (React) | `components/ces/portal/KxdSignatureExperience.tsx` |
| Arming script | `components/ces/portal/KxdSignatureArmingInline.tsx` |
| Sidebar attribution | `components/ces/portal/KxdPortalBrandSignature.tsx` |
| Styles | `design-system/ces/styles/kxd-portal-brand-signature.css` |
| **Integration (canonical)** | `app/(portal)/portal/(app)/layout.tsx` + `components/client-hq/ClientHqShell.tsx` |

Do **not** copy animation into client-specific folders. Client portal CSS may only override **post-intro** chrome (e.g. `kxd-primal-portal.css`).

---

## Portal coverage (Edition 1)

| Route group | Shell | Signature |
|-------------|-------|-----------|
| `portal/(app)/*` | `ClientHqAppShell` → `ClientHqShell` | **Yes** (automatic) |
| `portal/(welcome)/*` | Welcome ritual only | No (pre-dashboard) |
| `portal/(review-session)/*` | Review surface | No (dedicated flow) |
| `portal/(partner)/*` | `PartnerAppShell` | No (partner product) |

New client dashboards must route under `(app)` with `ClientHqAppShell` to inherit the experience.

---

## Attribution rules

Sidebar uses `KxdPortalBrandSignature` only. Stored `partnerFooterLine` values must not override official copy in the UI.

---

## Accessibility and mobile

- Intro is `aria-hidden` / presentational; no focus trap.
- Attribution link: visible focus ring, external link with `rel="noopener noreferrer"`.
- Test widths: 390, 430, 768, 1440 px — logo uses `clamp()`; copy scales with viewport.

---

## Verification

Run: `npm run verify:portal-brand-signature`

---

## Versioning

- **V2** storage prefix: `kxd-signature-experience-v2`.
- Bump prefix if timing or mandatory play rules change materially (forces one new play per tab).

Maintenance: edit only shared files above; one deploy propagates to all clients.