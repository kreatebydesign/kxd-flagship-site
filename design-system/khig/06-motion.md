# KHIG Part 6 — Motion

Motion communicates weight and state — not delight.

---

## Principles

| Quality | Meaning |
|---------|---------|
| **Confident** | Transitions complete decisively |
| **Calm** | No bounce, no elastic, no overshoot |
| **Natural** | Physical glide — objects have mass |

**Never flashy.** If motion draws attention to itself, it is too much.

---

## Duration Scale

| Token | Duration | Use |
|-------|----------|-----|
| instant | 100ms | Focus rings, micro-feedback |
| fast | 140ms | Color, opacity, collapse |
| base | 220ms | Hover lift, expand, page transition |
| slow | 320ms | Large surface changes only |

---

## Motion Catalog

### Transitions
State changes (hover, active, disabled): **140–220ms** with glide easing.

### Expansion
Evidence panels, accordion context: **220ms** height + opacity. Content reveals downward.

### Collapse
**140ms** — faster than expand. Respects user's desire to move on.

### Loading
Skeleton surfaces matching final layout. Subtle opacity pulse (optional).  
Full-page spinner: auth and initial load only.

### Hover
Transform `translateY(-1px)` optional + shadow deepen. Never scale buttons.

### Focus
Focus ring appears **instantly** — no animation delay.

### Navigation
Shell persists. Content area transitions. Sidebar selection: 140ms background.

### Page changes
220ms crossfade or 8px vertical glide. No horizontal carousel effects.

### Modal behavior
- Overlay: 140ms fade in
- Modal: 220ms glide from 8px below + fade
- Dismiss: reverse, slightly faster (140ms)

---

## Reduced Motion

When `prefers-reduced-motion: reduce`:

- All durations → `0.01ms`
- Transforms disabled
- Opacity changes allowed (instant)

---

Machine-readable: [`tokens/motion.ts`](./tokens/motion.ts)

---

*Next: [07-components.md](./07-components.md)*
