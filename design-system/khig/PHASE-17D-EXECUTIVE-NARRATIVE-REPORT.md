# Phase 17D — Executive Narrative Layer Foundation Report

**Edition 1 · Founder-Readable State**  
**Date:** June 25, 2026  
**Scope:** Deterministic narrative from Business Brain + Pulse — no UI, rituals, automation, or AI.

---

## Purpose

Phase 17D introduces the **Executive Narrative Layer** — the translation between intelligence systems and executive experience. It answers:

> **"How would a great operator explain what is happening?"**

| Layer | Question |
|-------|----------|
| Observer (17A) | What happened? |
| Business Brain (17B) | What does it mean? |
| Pulse (17C) | What changed? |
| **Executive Narrative (17D)** | **How should a founder understand the current business state?** |

Executive Narrative is **not** AI, **not** Executive Intelligence, and **not** the Morning Brief. It is deterministic narrative construction from trusted upstream context.

---

## Architecture

```
Business Systems
      ↓
   Observer (17A)
      ↓
Business Brain (17B)
      ↓
Pulse Engine (17C)
      ↓
Executive Narrative (17D)  ← this phase
      ↓
Executive Rituals (future wiring)
      ↓
Future Automation
```

**Entry point:**

```typescript
import { runExecutiveNarrative } from "@/lib/executive-narrative";

const result = await runExecutiveNarrative();
```

---

## Responsibilities

Executive Narrative:

- Translates Brain signals and Pulse movement into calm operator prose
- Structures narrative into opening, state, changes, attention, stability, closing
- Resolves an overall tone (calm → urgent)
- Produces a full-text digest for future ritual consumption

Executive Narrative does **not**:

- Make decisions
- Recommend actions
- Create tasks
- Automate
- Replace `lib/intelligence/briefings/narrative.ts` (Executive Intelligence unchanged)
- Render UI
- Use AI generation

---

## Data Flow

```
runExecutiveNarrative()
  → runPulse()                    // Brain + Observer internally
  → getLatestBusinessBrainResult()
  → resolveNarrativeTone()
  → buildOpeningSection()
  → buildBusinessStateSection()
  → buildChangesSection()
  → buildAttentionSection()
  → buildStabilitySection()
  → buildClosingSection()
  → buildExecutiveNarrativeDigest()
  → ExecutiveNarrativeResult
```

No direct database queries. No duplicate Brain or Pulse logic.

---

## Inputs

| Input | Source |
|-------|--------|
| Business Brain result | `getLatestBusinessBrainResult()` after `runPulse()` |
| Pulse result | `runPulse()` |

---

## Outputs

```typescript
type ExecutiveNarrativeResult = {
  generatedAt: string;
  opening: NarrativeSection;
  businessState: NarrativeSection;
  changes: NarrativeSection;
  attention: NarrativeSection;
  stability: NarrativeSection;
  closing: NarrativeSection;
  overallTone: NarrativeTone;
  digest: ExecutiveNarrativeDigest;
};
```

### NarrativeSection

| Field | Purpose |
|-------|---------|
| `id` | Stable section identifier |
| `title` | Section heading |
| `paragraphs` | Composed prose blocks |
| `sentences` | Atomic sentence list |

### NarrativeTone

| Tone | When |
|------|------|
| calm | Quiet/stable posture, low movement |
| measured | Normal active state |
| attentive | Multiple watch items or changes |
| pressured | Elevated posture or strained brain summary |
| urgent | Critical signals or urgent pulse digest |

### ExecutiveNarrativeDigest

| Field | Purpose |
|-------|---------|
| `headline` | From Pulse executive digest |
| `fullText` | All sections combined |
| `sentences` | Flat sentence array |
| `wordCount` | Reading-time foundation for rituals |

---

## Section Model

| Section | Source |
|---------|--------|
| Opening | Pulse posture + digest headline + brain observation count |
| Business State | Brain summary + signals + pulse posture |
| Changes | Pulse changes + digest top changes |
| Attention | Brain attention + pulse watchlist + priorities |
| Stability | Pulse stable signals + brain stable patterns |
| Closing | Tone-matched closing + pattern count + non-prescriptive reminder |

---

## What It Intentionally Does Not Do

| Excluded | Reason |
|----------|--------|
| UI rendering | Foundation only |
| Morning Brief / Focus / Review changes | Future ritual wiring |
| Executive Intelligence replacement | Separate system in `lib/intelligence/` |
| Automation | Future phase |
| AI / LLM generation | Deterministic templates only |
| Direct business system queries | Brain + Pulse are sole inputs |

---

## Future Executive Ritual Integration

| Ritual | Narrative input (future) |
|--------|--------------------------|
| Morning Brief | `opening` + `changes` + `digest.headline` |
| Focus Mode | `attention` section filtered by tone |
| Weekly Review | `stability` + `changes` across pulse history |

Rituals continue using existing briefing builders until explicitly wired.

---

## Future Automation Integration

Automation will not consume narrative directly. Narrative is human-facing prose. Automation gates remain on Observer `automation` metadata, Brain severity, and Pulse posture — not narrative text.

---

## Files Created

```
lib/executive-narrative/
  types.ts
  templates.ts
  tone.ts
  sections.ts
  narrative.ts
  digest.ts
  run.ts
  index.ts
```

## Files Modified

None — additive only. Observer, Business Brain, Pulse, and Executive Intelligence unchanged.

---

## Example Output Shape

```json
{
  "generatedAt": "2026-06-25T12:00:00.000Z",
  "opening": {
    "id": "narrative-opening",
    "title": "Opening",
    "paragraphs": [
      "There is meaningful activity across the portfolio. Business is active. The interpreted business posture is active across 47 observations."
    ],
    "sentences": [
      "There is meaningful activity across the portfolio.",
      "Business is active.",
      "The interpreted business posture is active across 47 observations."
    ]
  },
  "businessState": {
    "id": "narrative-business-state",
    "title": "Business State",
    "paragraphs": [
      "Business activity is present and understood. The Business Brain has interpreted 6 signals across Delivery pressure, Operational load."
    ],
    "sentences": ["..."]
  },
  "changes": {
    "id": "narrative-changes",
    "title": "What Changed",
    "paragraphs": ["One meaningful shift stands out since the last pulse."],
    "sentences": ["..."]
  },
  "attention": {
    "id": "narrative-attention",
    "title": "What Deserves Awareness",
    "paragraphs": ["A few areas may deserve calm founder awareness."],
    "sentences": ["..."]
  },
  "stability": {
    "id": "narrative-stability",
    "title": "What Is Holding Steady",
    "paragraphs": ["Some areas are holding steady across recent runs."],
    "sentences": ["..."]
  },
  "closing": {
    "id": "narrative-closing",
    "title": "Closing",
    "paragraphs": [
      "The state is clear. Awareness is sufficient for now. This narrative describes the current state — it does not prescribe what to do next."
    ],
    "sentences": ["..."]
  },
  "overallTone": "measured",
  "digest": {
    "headline": "Business is active.",
    "fullText": "There is meaningful activity across the portfolio...\n\nBusiness activity is present...",
    "sentences": ["..."],
    "wordCount": 142
  }
}
```

---

## Build Status

```
npm run build — PASSED (Next.js 16.2.7, TypeScript clean)
```

---

## Conclusion

The Executive Narrative Layer is the founder-readable bridge between structured intelligence and future ritual experiences. It explains the business state calmly and deterministically — without decisions, recommendations, or AI.
