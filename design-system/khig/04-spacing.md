# KHIG Part 4 — Spacing

No arbitrary spacing. Everything derives from one scale.

---

## Base Unit

**4px** — all spacing is a multiple of 4.

---

## Spacing Language

| Name | Value | Use |
|------|-------|-----|
| Micro | 4px | Icon gaps, tight inline |
| Small | 8px | Badge padding, inline pairs |
| Medium | 12px | Compact list gaps |
| Large | 16px | Default stack gap |
| XL | 24px | Card inner padding |
| Section | 32px | Between sections |
| Page | 40px | Major section separation |
| Page Y | 48px | Page vertical padding |
| Hero | 64px | Hero / narrative separation |

Machine-readable: [`tokens/spacing.ts`](./tokens/spacing.ts)

---

## Layout Widths

| Name | Value | Use |
|------|-------|-----|
| Content Width | 72rem | Operations pages, intelligence |
| Page Width | 80rem | Wide dashboards |
| Reading Width | 44rem | Narratives, prose, recommendations |
| Narrow Width | 42rem | Forms, focused panels |

**Why reading width matters:** Executive narratives at full viewport width are exhausting. Constrain prose.

---

## Vertical Rhythm

| Relationship | Gap |
|--------------|-----|
| Label → content | 12px |
| Heading → body | 16px |
| Paragraph → paragraph | 16px |
| Section → section | 32px |
| Briefing block → block | 40px |

---

## Card Padding

Standard card padding: **24px** (XL).  
Compact card padding: **16px** (Large) — only for dense operational lists.

---

## Rules

1. Never use odd pixel values (13px, 17px, etc.)
2. If it feels tight, add one step on the scale — do not use arbitrary values
3. Whitespace is not wasted space — it is hierarchy
4. Intelligence page sets the spacing standard for Edition 1

---

*Next: [05-elevation.md](./05-elevation.md)*
