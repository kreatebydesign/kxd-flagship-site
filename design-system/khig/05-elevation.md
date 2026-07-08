# KHIG Part 5 — Elevation

Depth communicates hierarchy. Borders are a last resort.

---

## Surface Hierarchy

| Level | Name | Use |
|-------|------|-----|
| 0 | Canvas | Application background |
| 1 | Page | Content field |
| 2 | Surface | Cards, lists |
| 3 | Elevated | Hover, emphasis |
| 4 | Floating | Modals, primary recommendation |

Objects sit **in space**, not on a grid of outlines.

---

## Shadow Philosophy

- Shadows are **warm near-black**, never harsh
- Inset **rim light** (top edge) simulates machined titanium
- Hover deepens shadow — object rises
- Press inverts — inset shadow, settled weight

**Why:** Physical metaphors reinforce calm confidence. Flat Material shadows feel generic.

---

## Border Philosophy

| Use borders | Do not use borders |
|-------------|-------------------|
| Glass card edge definition | Every list row |
| Modal edge | Section separation (use divider + space) |
| Input fields | Navigation chrome |

Default separation: **luminance + shadow + space**.

---

## Radius Philosophy

| Token | Value | Use |
|-------|-------|-----|
| sm | 6px | Buttons, inputs, badges |
| md | 10px | Cards, panels |
| lg | 14px | Modals |
| full | pill | Badges, avatars |

Corners are soft, not bubbly. Never use 24px+ radius on operational UI.

---

## Glass Usage

Glass surfaces use:

- Subtle gradient overlay
- Optional `backdrop-filter: blur(12px)` where supported
- Hairline border at 8% white

**When to use glass:** Intelligence briefing cards, premium editorial moments.  
**When not:** Dense data tables, Payload admin forms, every panel.

---

## When to Use Cards

| Use a card | Do not use a card |
|------------|-------------------|
| One grouped thought (recommendation, insight) | Every row in a list |
| Expandable evidence block | Wrapping static text |
| Platform status summary | Navigation items |

---

## Layering

```
Canvas (z: auto)
  └── Shell / Navigation (persistent)
  └── Page content
        └── Section surfaces
        └── Cards (rest elevation)
        └── Modals / Drawers (floating + overlay)
```

Modals always include overlay scrim. Drawers may use lighter scrim.

---

*Next: [06-motion.md](./06-motion.md)*
