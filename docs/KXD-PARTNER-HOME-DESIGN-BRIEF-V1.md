# KXD Partner Home — Design Brief V1

**Surface:** Authenticated Partner Home only (`/portal/partner`).  
**Binding:** `docs/KXD-EXPERIENCE-STANDARD-V1.md`.  
**Does not authorize:** Implementation, CSS, routes, assets, data, or commits. A separate explicit request is required before any build.

This brief exists so Home can earn a KXD signature without becoming a dashboard, a sci-fi scene, or a thin internal document.

---

## 1. Audience

Invited referral partners in KXD Network: from a genuine first visit (no introductions, nothing paid) to a proven performer with real paid earnings.

They already passed the door. They are not a public visitor, not a client in CES, and not KXD staff. Language is membership and work — never onboarding theater, never “you are inside.”

---

## 2. Desired feeling

Admitted. Capable. Clear on the opportunity and the standard.

Not entertained. Not intimidated. Not managed by a dashboard. The room should feel private and expensive because the hierarchy is confident and the numbers are true.

---

## 3. Single job

**Get a qualified introduction submitted, or move an active one forward.**

One primary action per visit, bound to the real `snapshot.nextAction` (playbook, submit, book, or leads — never a decorative second gold CTA). Return reason: the member record has changed, or the standard still needs to be met.

---

## 4. Visual signature

**The held folio.**

Home is one private spread, not a page of modules:

- Warm ivory is the open leaf: identity, one sentence of purpose, the single next action.
- One large, flat near-black plate is the facing leaf: the member’s proof. Paid earnings as a typographic object; the **current** operating stage as the readable chapter; quieter stages as sequence, not equal spreadsheet rows.
- Below the spread, KXD Standard is the colophon — editorial qualification, not a widget.

Why this clarifies the job: the partner sees *who they are*, *what to do now*, and *whether the work has become money* — in one glance. Material contrast (ivory / matte charcoal) is the signature, not a chart and not a photograph.

No imagery is required for V1. Official gold mark remains `KxdLogo` in the rail only. Gold on the page: the one primary action (and nothing else).

This signature is for Partner Home. It is not a template for OS, CES, reports, or the public site.

---

## 5. Content hierarchy (real data only)

Order of attention. Nothing invented.

| Rank | Content | Source |
|------|---------|--------|
| 1 | Member name | `session.greetingName` or first token of `session.displayName`. Welcome form: “Welcome, {firstName}.” Rail may keep full display name. |
| 2 | Next action | `loadPartnerHomeSnapshot` → `nextAction.label`, `.href`, `.hint`. Button label and destination must match this object. Early members may still hear first-introduction language *only when* `submittedLeads`, `approvedEarningsCents`, and `paidEarningsCents` are all 0 **and** next action is the first-step path. Never a sample CTA. |
| 3 | Truthful operating stage | Same snapshot: Introduction = `submittedLeads`; Qualified = `qualifiedLeads`; Discovery = `bookedCalls`; Client won = `wonClients`; Paid = `formatPartnerCents(paidEarningsCents)`. **Current stage** = first incomplete stage, or Paid if the path is complete. Counts of 0 render as 0. |
| 4 | Paid earnings | `paidEarningsCents` via `formatPartnerCents`. Approved may appear as a quiet supporting line (`approvedEarningsCents`), never a second hero number. Genuine new members: `$0` and an honest unpaid explanation — never a demo `$4,500`. |
| 5 | KXD Standard | Exact current criteria, unchanged: decision-maker, live moment, real need; judgment over volume. 01 reachable owner; 02 brand/presence gap; 03 why now; 04 openness to a short discovery. |

Kicker remains “KXD Network · Private access.” Purpose line remains the honest division of labor: the partner brings the introduction; KXD qualifies, discovers, and closes.

Do not add testimonials, ranks, streaks, pipeline charts, or projected earnings.

---

## 6. Composition

**Desktop**

- Keep the Partner member-tool shell: matte-black rail, official `KxdLogo`, ivory main.
- Asymmetric folio: ivory leaf ~0.9fr (name, purpose, one CTA); charcoal plate ~1.1fr, tall enough to own the canvas — not a small card in a void, not a full-bleed dark takeover.
- Operating path on the plate is an editorial sequence: current stage emphasized; other stages present and truthful, visually secondary.
- KXD Standard sits under the folio as a two-column brief (statement + numbered criteria), separated by a hairline — close enough that the screen does not read as a short memo floating in ivory.
- One gold button. No card grid. No second black panel.

**Mobile**

- Intentional stack, not a squeezed desktop: identity → purpose → primary action → charcoal record (paid, current stage, then the rest of the path) → Standard.
- The plate follows the CTA; it does not compete above the name.
- Type stays readable; path does not become a horizontal table.

---

## 7. Motion and imagery

**Motion.** Enter: short opacity (and optional 4–8px translate) on the folio, ~200–250ms, once. Button hover/focus only. No looping signals, no path animation as identity, no parallax. Honor `prefers-reduced-motion` (static composition, same hierarchy).

**Imagery.** None on Home V1. No stock, no generated art, no texture overlay, no photographic hero. If a later brief adds an owned editorial still, it remains optional, responsive, and never a substitute for name, action, stage, or paid proof.

---

## 8. Anti-references

Home must not resemble:

- **Xbox / HUD** — glowing nodes, achievement chrome, gamer density
- **Cyber map** — constellations, network graphs, 3D fields, “command surface” diagrams
- **SaaS dashboard** — KPI tiles, card grids, status chips, charts
- **Generic luxury landing page** — oversized marketing hero, lifestyle photography, slogan theater
- **Excessive darkness** — a black app, inverted dashboard, or dark canvas that swallows the ivory room

Also reject: generic agency admin, spreadsheet printout, and “merely clean” layouts that could belong to any product.

---

## 9. Acceptance criteria

Implementation is **not** approved until desktop and mobile screenshots (active record **and** genuine zero-state) show all of the following:

- Distinct held-folio signature: ivory leaf + one substantial charcoal plate + Standard as colophon. Not merely clean; not a thin document; not a dashboard.
- First desktop viewport must read as one asymmetric folio spread—not a sidebar plus ordinary content column. The ivory leaf and charcoal plate must create a deliberate, full-canvas composition.
- The charcoal plate must treat Paid to date and the current operating chapter as editorial proof, never as dashboard metrics: no card-within-card layout, mini-label pile, or compressed pipeline row.
- Could not pass as an unnamed agency or SaaS home.
- Official `KxdLogo` only; gold only on logo + one primary action.
- Name is the partner’s. Paid amount matches `paidEarningsCents` (`$0` when unpaid).
- Operating stage matches snapshot counts; zeros are zeros; current chapter is obvious.
- Primary control is the real `nextAction` (label + href). One job is obvious.
- KXD Standard text is the exact honest criteria.
- No HUD, cyber map, card grid, decorative chart, glow, glass, or ungoverned image.
- Mobile stack: name and action first, then the plate.
- Reduced-motion still reads as the same folio.

This document is the brief. It is not a build ticket.
