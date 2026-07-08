# KHIG Part 3 — Typography

Typography is the primary hierarchy system in KXD OS. Color supports; type leads.

---

## Font Families

| Family | Role | Why |
|--------|------|-----|
| **Cormorant Garamond** (serif) | Presence | Editorial confidence — KXD is a design company |
| **SF Pro / Outfit** (sans) | Precision | Legible controls, metadata, dense lists |
| **System mono** | Reference | Work numbers, IDs — scannable, not decorative |

---

## Type Scale

| Role | Size | Font | Use |
|------|------|------|-----|
| Display | 2.75rem | Serif | Rare hero moments only |
| Executive Heading | clamp(1.5–2rem) | Serif | Page titles, narrative openings |
| Section Heading | 0.6875rem uppercase | Sans | Panel labels — quiet anchors |
| Card Heading | 1.3125rem | Serif | Recommendation titles |
| Metric | 2.25rem | Serif | KPI values, health scores |
| Body Large | 1.125rem | Serif | Creative briefs, editorial blocks |
| Body | 0.9375rem | Sans | Default reading |
| Body Small | 0.8125rem | Sans | Compact lists |
| Caption | 0.75rem | Sans | Timestamps, fine print |
| Label | 0.8125rem medium | Sans | Form labels |
| Metadata | 0.875rem | Mono | WK-000001, system IDs |
| Recommendation | 1.5rem | Serif | Primary recommendation |
| Narrative | clamp(1.5–2rem) | Serif | Executive briefing narrative |
| Insight | 1.125rem | Serif | Executive observations |

Machine-readable: [`tokens/typography.ts`](./tokens/typography.ts)

---

## Rules

### Maximum reading comfort

- **Line length:** 45–72 characters for narrative prose (`max-width: 44rem`)
- **Line height:** 1.45–1.6 for body; tighter for display
- **Letter spacing:** Negative tracking only on large serif display

### Excellent hierarchy

- One serif presence moment per viewport section
- Never compete: if title is serif, metadata must be sans muted
- Client names always louder than surrounding metadata

### Premium rhythm

- Section label → 0.75–1.25rem gap → content
- Paragraph spacing ≥ 1em within prose blocks
- Lists use consistent vertical rhythm (see spacing)

### Executive readability

- Narratives use serif at 1.5rem+ — founders read briefings, not bullet dumps
- Recommendations use serif titles with sans supporting text
- Insights use serif observations — observations are editorial, not alerts

---

## Anti-patterns

| Do not | Why |
|--------|-----|
| Uppercase everything | Feels enterprise, not editorial |
| Serif on buttons | Illegible at small sizes |
| Same size for title and body | Collapses hierarchy |
| Harsh white on black | Eye fatigue — use cream `#F5F6F8` |

---

*Next: [04-spacing.md](./04-spacing.md)*
