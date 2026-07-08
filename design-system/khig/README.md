# KXD Human Interface Guidelines (KHIG)

**Edition 1 · Industrial Design Constitution**  
**Status:** Active standard for all KXD OS screens  
**Scope:** KXD OS internal operations (`/admin/operations`), Payload admin surfaces, and future Edition 1 modules

---

## What KHIG Is

KHIG is KXD's product language — not a component library, not a CSS refactor, not a framework theme.

It is the **design constitution** that answers:

- Why does KXD OS look and feel this way?
- How should every future screen be judged?
- What is allowed, discouraged, and forbidden?

Think **Apple Human Interface Guidelines** for a luxury creative operating system.

---

## What KHIG Is Not

- Not Material Design
- Not Bootstrap patterns
- Not Tailwind defaults
- Not "dark mode with gold accents"
- Not a mandate to rebuild existing screens immediately (Phase 16A establishes standards only)

---

## Relationship to Existing Systems

| System | Role |
|--------|------|
| `docs/KXD-OS-VISUAL-MANIFESTO.md` | Emotional north star — art direction |
| `design-system/khig/` | **Constitution** — principles, tokens, language, scorecard |
| `design-system/os/tokens/` | Implementation tokens (current codebase) |
| `design-system/os/styles/kxd-os.css` | Runtime CSS (future phases align to KHIG) |
| `components/os/` | Component primitives |

Future Industrial Design phases rebuild screens **against KHIG**, not against subjective preference.

---

## Document Index

| Document | Contents |
|----------|----------|
| [01-philosophy.md](./01-philosophy.md) | Design philosophy, product principles, executive experience, hierarchy, accessibility, empty/loading/interaction |
| [02-colors.md](./02-colors.md) | Semantic color system — emotional purpose for every role |
| [03-typography.md](./03-typography.md) | Editorial type scale — display through metadata |
| [04-spacing.md](./04-spacing.md) | Spacing language — scale, rhythm, content widths |
| [05-elevation.md](./05-elevation.md) | Surfaces, shadows, borders, radius, glass, layering |
| [06-motion.md](./06-motion.md) | Motion principles — transitions, not animations |
| [07-components.md](./07-components.md) | Component audit — purpose, variants, rules |
| [08-product-language.md](./08-product-language.md) | How KXD speaks — intelligence, warnings, empty states |
| [09-scorecard.md](./09-scorecard.md) | Industrial Design review checklist (A–F) |
| [tokens/](./tokens/) | Machine-readable semantic token definitions |

---

## Core Tenets (Summary)

1. **Calm over clever** — The founder should feel in control, not managed.
2. **Editorial over dashboard** — Hierarchy reads like a briefing, not a BI tool.
3. **Depth over outlines** — Surfaces separate through luminance, not grid lines.
4. **Gold as accent, never paint** — Champagne appears only when earned (< 3% of viewport).
5. **Evidence over assertion** — Intelligence speaks with proof, not personality.
6. **Space is luxury** — If it feels tight, it feels cheap.
7. **One strong moment per viewport** — Everything else supports.

---

## Usage

Before shipping any KXD OS screen:

1. Read relevant KHIG sections
2. Map UI to semantic tokens (`design-system/khig/tokens/`)
3. Score the screen using [09-scorecard.md](./09-scorecard.md)
4. Do not ship below **B** without documented exception

---

*Kreate by Design · KXD OS Edition 1*
