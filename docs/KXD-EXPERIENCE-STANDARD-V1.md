# KXD Experience Standard V1

**Status:** Source of truth for private KXD product surfaces. Partner Portal first; later KXD OS, client command, and reports.  
**Does not replace:** `docs/KXD-OS-CONSTITUTION.md` (experience law) or marketing brand DNA.  
**Does not authorize:** UI, logo, route, or data changes. Implement only when explicitly requested.  
**Major new surface:** No implementation until the design brief in §4 exists.

Private KXD should feel like a held room: Apple-level clarity, editorial restraint, premium craft. Exclusive. Never gamer, cyberpunk, or generic SaaS-dashboard.

Luxury comes from typography, composition, material contrast, whitespace, real content, and one confident hierarchy — not from effects.

---

## 1. Visual principles

1. **System + signature.** KXD product surfaces share a disciplined system, but each important surface gets one purposeful visual signature tied to its job. The signature can be a composition, editorial image treatment, typography moment, material contrast, or real-data visualization. It must clarify the experience — not decorate it.
2. **One moment.** Each viewport has a single visual owner: a name, a number, a path, a proof, or a decision. Everything else supports it.
3. **Private, not theatrical.** The member should feel admitted — never entertained, onboarded, or gamified.
4. **Facts over atmosphere.** Counts, paid amounts, statuses, and next actions come from the real record. Empty states are honest zeros with a first step.
5. **Editorial, not operational chrome.** Sentence-case language. Quiet kickers. No badge soup. No metric theater.
6. **Material contrast.** Structure and field do the work. Hairline rules. Almost no radius. Flat surfaces unless a defined signature needs restrained light.
7. **No template sameness.** The matte-black rail + warm ivory workspace is appropriate for private KXD member tools. It must not become the universal answer for every KXD product, client portal, report, or public site. Reuse principles and components — not identical page compositions.
8. **Immersion through story.** For high-value entry moments, immersion comes from sequence, real proof, editorial composition, and controlled motion — not futuristic diagrams, dashboards, or effects.
9. **Mobile is a composition.** Stack with intention. Do not shrink a desktop layout.

**Logo.** Official gold mark only via `KxdLogo` and `public/migrated-assets/brand/kxd-logo-transparent.png`. Never redraw, approximate, distort, crop into a monogram substitute, or replace it with CSS/SVG type.

**Imagery.** No random stock, filler, or ungoverned generated imagery. Visual assets may be used when they are part of a defined KXD art direction, connected to real content, licensed/owned, responsive, and optional — not a substitute for product clarity.

---

## 2. Never do this

- Gamer / HUD / cyberpunk / neon / scanlines / “command center” spectacle
- Glow, bloom, glassmorphism, texture overlays, noise, fake paper grain
- Decorative neon/AI gradients and generic gradient washes
- Particles, 3D maps, WebGL experiments, decorative charts, sparkline wallpaper
- Random stock, filler PNGs, or ungoverned generated imagery
- Unofficial logo files; redrawn, rounded, outlined, or abbreviated KXD marks
- Generic card grids, KPI tiles, status chips as decoration
- Fake social proof, placeholder earnings, invented member counts
- Blue SaaS buttons, purple AI accents, rainbow semantic color
- Heavy drop shadows, floating docks, skeuomorphic gold bars
- Motion as spectacle: looping orbits, particle drift, parallax showpieces
- Applying the Partner ivory/rail composition to public site, reports, or unrelated products by default
- Compressed desktop on mobile; horizontal data tables as the primary mobile pattern
- Copy that claims arrival (“You are inside KXD”) instead of membership and work

---

## 3. Craft rules

### Type

- Inherit the OS / Partner sans stack (SF Pro / system). Do not introduce a third display face on Partner without a dedicated request.
- Hierarchy: page title → one lead sentence → body / records. Kickers are small, not shouting.
- Numbers: tabular lining figures. Paid amounts are typographic objects, not badges.
- Sentence case for titles and actions. Uppercase only for rare, tiny kickers.
- Line length: welcome and purpose stay short; do not fill the canvas with paragraphs.

### Color

| Role | Direction | Partner tokens (reference, member tools) |
|------|-----------|----------------------------|
| Workspace | Warm ivory | `--kxd-partner-canvas` `#f3eee6` |
| Structure | Matte near-black | `--kxd-partner-rail` `#111110`; record `#161513` |
| Ink | Near-black on ivory; ivory on structure | `--kxd-partner-ink` `#1c1914` |
| Mute | Warm stone gray | `--kxd-partner-ink-muted` / rail muted |
| Gold | Official mark + **one** primary action + rare live signal | `--kxd-os-gold` / `--kxd-partner-gold` |

Gold is not a brand wash. If gold appears more than once besides the logo and the primary button, remove it.

Restrained photographic color grading or material light treatment is permitted when it serves a defined surface concept. Decorative neon/AI gradients and generic UI gradient washes are not.

### Spacing

- Breath is luxury. Prefer gap and padding over rules.
- Partner Home: asymmetric two-column on desktop; single column on small screens with the record after welcome/CTA.
- Do not use empty `space-between` bands to “fill the viewport.”

### Surface

- On Partner member tools: ivory field; flat charcoal member record.
- No inner glow, no glass, no generic gradient wash.
- Radius: `3px` or none. Never rounded SaaS cards.
- One deep surface per moment. Do not stack competing black panels.

### Border

- Hairlines only: `rgba(28, 25, 20, 0.12)` on ivory; faint ivory on charcoal.
- Rules separate chapters (e.g. KXD Standard), not every label.

### Button

- One primary gold fill per screen (`#c2aa72` on near-black type).
- Ghost / text for secondary. Never a second gold block.
- Labels are verbs that match the real next step (first introduction vs. another introduction).

### Icon

- Prefer none. If required: hairline, 16–18px, currentColor, never colored glyph sets.
- Navigation is words. Do not iconize the Partner rail.

### Motion

- Allowed: short opacity/translate on enter (~200–250ms), button hover, focus rings, reduced-motion off-ramp; sequence on high-value entry when the brief calls for it.
- Purpose: orientation, reveal, and feedback — never spectacle.
- Forbidden: ambient loops, 3D camera, signal particle travel as identity.
- Honor `prefers-reduced-motion`.

---

## 4. Design brief (required before any major new surface)

No implementation until this brief exists, in writing:

- **Audience and desired feeling**
- **One job** the screen must accomplish
- **One visual signature** (composition, editorial image, type moment, material, or real-data visualization) and why it clarifies the job
- **Real data/content source** (loader, record, owned/licensed asset — never placeholders)
- **Desktop and mobile composition**
- **Explicit anti-references** (what it must not resemble)

The brief does not authorize work. A separate, explicit implementation request still required.

---

## 5. Partner Portal rules

Shared for this member tool: matte-black left rail, official `KxdLogo`, member name, “KXD Network / Private access.” Ivory main. Do not restyle login or other routes when working a single screen. This shell is the Partner signature system — not a template to clone onto every KXD surface.

**Login** (`/portal/login?redirect=/portal/partner` only)

- Partner sign-in is a gated private door, not CES “Your workspace.”
- Client login stays unchanged.
- No dashboard preview, no fake earnings, no ungoverned scene behind the form.

**Home**

- Member record, not an internal report and not a cinematic demo.
- Left: welcome by first name, one-sentence purpose, one CTA.
- Right: one flat charcoal record — paid amount, approved status, operating path (Introduction → Qualified → Discovery → Client won → Paid) from live snapshot.
- `$0` for genuine new members, with a first-introduction path. Never a sample `$4,500`.
- KXD Standard is an editorial qualification brief with the exact honest criteria — not a checklist widget.
- Do not add a command-surface experiment, constellation, or chart above this composition unless a future request includes a §4 brief and explicitly supersedes this Home signature.

**Playbook**

- Field guide, not a help center. Chapters, pull quotes, scripts. One reading column.

**Leads / introductions**

- A list of real introductions with truthful visibility states.
- No pipeline kanban chrome. Detail pages are records, not tickets.

**Earnings**

- Ledger language. Paid and approved from the earnings loader only.
- No decorative charts, no projected “potential,” no filler lifestyle imagery.

**Booking**

- Calm scheduling of KXD into a real opportunity. Confirm times; do not gamify availability.

---

## 6. Visual QA checklist

Reject the screen if any item fails.

- [ ] Official logo is `KxdLogo` only; no substitute mark
- [ ] Has a distinct, purposeful KXD signature — or is it merely clean? If merely clean, reject
- [ ] Could this exact screen belong to any agency or SaaS product? If yes, reject
- [ ] Partner member tools: ivory + near-black + at most one gold CTA (plus logo)
- [ ] One primary action; return path is obvious (record, next step, or chapter)
- [ ] All numbers match live partner data; zeros are zeros
- [ ] No card grid, KPI tiles, or decorative chart
- [ ] No glow, glass, 3D, particles, neon, decorative/AI gradient wash, or texture overlay
- [ ] Imagery (if any) is directed, owned/licensed, tied to real content, responsive, and optional
- [ ] Operating path is readable progression, not spreadsheet labels
- [ ] Copy is private-member tone; no fake claims
- [ ] Desktop uses the canvas with intention (not a thin document lost in whitespace, not a packed dashboard)
- [ ] Mobile stacks: identity/action first, then record; no pinched rail+chart
- [ ] Reduced motion does not leave a broken layout
- [ ] Major new surface has a §4 brief
- [ ] Screenshot both desktop and mobile, active and genuine empty, before calling it done

---

## 7. Future reusable KXD OS inventory

Build only when a surface needs them. Keep them modular, data-honest, and effect-free. Reuse the system — not one page layout.

| Component | Role |
|-----------|------|
| `KxdLogo` | Sole official mark (already exists) |
| `KxdPrivateShell` | Ivory workspace + matte rail for **member tools**; not the default for reports, public site, or every OS screen |
| `KxdMemberRecord` | Flat charcoal record: identity, paid/approved, path |
| `KxdEditorialBrief` | Standard / policy / qualification copy + numbered criteria |
| `KxdArrival` | Kicker, welcome, one sentence, one CTA |
| `KxdPath` | Ordered real-stage progression (not a chart) |
| `KxdLedgerLine` | Earnings or status row with tabular figures |
| `KxdPrimaryAction` | Single gold button bound to the true next action |
| `KxdEmptyPath` | Honest zero-state + first step |
| `KxdPrivateSignIn` | Gated partner (or future private) login variant |

Do **not** inventory: scene graphs, particle fields, 3D globes, dashboard widgets, generic card kits.

When in doubt: delete decoration, keep the record, keep the action, keep the gold mark — then ask whether the signature still names the job.
