# KHIG Part 2 — Color System

The KXD OS color system is an **emotional system**, not a palette picker.

Every color has a job. If a color has no job, it does not belong on screen.

---

## Emotional Intent

KXD OS should feel like entering a **private studio at night** — warm enough to feel human, dark enough to focus, premium enough to trust.

We design with **luminance layers**, not colored boxes.

---

## Semantic Roles

| Role | Token | Purpose | When to use |
|------|-------|---------|-------------|
| Application Background | `application.background` | Atmospheric canvas | Page root, shell backdrop |
| Primary Surface | `surface.primary` | Main content field | Page body |
| Secondary Surface | `surface.secondary` | Grouped content | Cards, list containers |
| Elevated Surface | `surface.elevated` | Raised objects | Hover rows, emphasis |
| Navigation Surface | `surface.navigation` | Persistent chrome | Sidebar, top bar |
| Section Surface | `surface.section` | Inset grouping | Subsections within a page |
| Border | `border.default` | Separation fallback | When depth is insufficient |
| Subtle Border | `border.subtle` | Hairline dividers | List separators |
| Primary Text | `text.primary` | Names, titles, decisions | Headlines, client names |
| Secondary Text | `text.secondary` | Supporting prose | Body, reasons |
| Muted Text | `text.muted` | Metadata | Timestamps, captions |
| Divider | `border.divider` | Section breaks | Horizontal rules |
| Accent | `accent.primary` | Champagne gold | Primary CTA, earned moments |
| Success | `semantic.success` | Positive state | Completion, healthy |
| Warning | `semantic.warning` | Attention needed | Elevated priority |
| Critical | `semantic.critical` | Emergency | Blocked, failure |
| Information | `semantic.info` | Neutral info | Timeline, references |
| Selection | `interactive.selection` | Selected item | Active nav, selected row |
| Focus | `interactive.focus` | Keyboard focus | Accessibility |
| Hover | `interactive.hover` | Hover state | Interactive rows |
| Pressed | `interactive.pressed` | Active press | Buttons, toggles |
| Disabled | `interactive.disabled` | Inactive | Disabled controls |
| Overlay | `overlay.scrim` | Modal scrim | Behind dialogs |
| Modal Background | `surface.modal` | Dialog surface | Modals, drawers |
| Glass | `surface.glass` | Translucent depth | Briefing cards, intelligence |

Machine-readable definitions: [`tokens/colors.ts`](./tokens/colors.ts)

---

## Gold Rules

Champagne gold (`#C2AA72`) is **accent**, never dominant.

| Allowed | Forbidden |
|---------|-----------|
| Primary CTA button | Navigation background |
| One emphasis moment per viewport | Metadata labels |
| Intelligence primary recommendation border | Badge defaults |
| Brand presence in hero | Decorative borders everywhere |

**Maximum:** Gold should occupy **less than 3%** of any viewport.

**Why:** Gold is KXD's material signature. Overuse makes it feel like paint, not craft.

---

## Semantic Color Rules

1. **Critical red** — Only for true blockers or failures. Not for "important."
2. **Warning amber** — Attention soon, not panic.
3. **Success green** — Completion and health. Never celebratory confetti.
4. **Info blue** — Neutral reference. Never primary actions.

If everything is semantic-colored, nothing is.

---

## Text on Surface

| Combination | Minimum contrast |
|-------------|------------------|
| Primary text on canvas | 7:1 |
| Secondary text on surface | 4.5:1 |
| Muted text on surface | 4.5:1 |
| Accent on dark surface | Use sparingly; verify 4.5:1 |

---

## Implementation Note

Current runtime CSS uses `--kxd-os-*` variables in `design-system/os/styles/kxd-os.css`.  
KHIG tokens in `tokens/colors.ts` are the **target semantic contract**.  
Future phases map CSS variables to KHIG without changing the emotional system.

---

*Next: [03-typography.md](./03-typography.md)*
