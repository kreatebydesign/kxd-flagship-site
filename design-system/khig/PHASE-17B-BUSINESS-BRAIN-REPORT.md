# Phase 17B — Business Brain Foundation Report

**Edition 1 · Structured Understanding**  
**Date:** June 25, 2026  
**Scope:** Deterministic business interpretation from observations — no UI, Pulse, automation, or ritual changes.

---

## Purpose

Phase 17B introduces the **Business Brain** — the layer that answers:

> **"What does this mean in business context?"**

Where the Observer (17A) answers **"What happened?"**, the Business Brain interprets observations into signals, patterns, attention items, and a calm summary — without executing anything.

---

## Architecture

```
Business Systems
      ↓
   Observer (17A)
      ↓
Observation Registry + History
      ↓
Business Brain (17B)  ← this phase
      ↓
Future Pulse
      ↓
Executive Narrative / Rituals
      ↓
Future Automation
```

**Entry point:**

```typescript
import { runBusinessBrain } from "@/lib/business-brain";

const result = await runBusinessBrain();
```

---

## What the Brain Consumes

| Input | Source |
|-------|--------|
| Current observations | `runObserver()` |
| Observation history | `getObservationHistory()` |
| Repeated fingerprints | `history.repeated()` |
| Stable fingerprints | `history.stable(3)` |
| Novel fingerprints | `history.novel()` |

The Brain **does not** directly query Payload collections or duplicate observer logic.

---

## What the Brain Produces

```typescript
type BusinessBrainResult = {
  generatedAt: string;
  observationCount: number;
  signalCount: number;
  patternCount: number;
  attentionCount: number;
  signals: BusinessSignal[];
  patterns: BusinessPattern[];
  attention: ExecutiveAttentionItem[];
  summary: BusinessBrainSummary;
};
```

### BusinessSignal — interpreted meaning

Example progression:

| Layer | Example |
|-------|---------|
| Observation (fact) | "3 deliverables are due within 7 days." |
| Signal (meaning) | "Delivery pressure is elevated across the portfolio." |

Taxonomy keys include:

- `business.delivery.pressure`
- `business.relationship.engagement`
- `business.operations.load`
- `business.overdue.risk`
- `business.review.backlog`
- `business.health.pressure`
- `business.execution.momentum`
- `business.memory.lifecycle`
- `business.communications.attention`
- `business.client-requests.open`

### BusinessPattern — trends from history

- Repeated blocked work
- Repeated delivery pressure
- Repeated review backlog
- Repeated communications attention
- Increasing operational load
- Stable execution momentum
- Novel high-importance signals

### ExecutiveAttentionItem — human review, not recommendation

Example:

- **Title:** "Upcoming deliverables may need review"
- **Context:** "Delivery pressure is present in the portfolio. Worth a calm review of what is due soon."

**Never says:** "Reassign work." · "Notify client." · "Create task."

### BusinessBrainSummary

- `headline` — one-line posture
- `narrative` — calm executive prose
- `dominantThemes` — taxonomy labels
- `overallPosture` — clear · active · pressured · strained

---

## What It Intentionally Does Not Do

| Excluded | Reason |
|----------|--------|
| UI rendering | Phase 17B is foundation only |
| Automation execution | Future Automation Engine |
| Task creation | Future phases |
| Notifications | Future phases |
| Briefing behavior changes | Executive Intelligence unchanged |
| Ritual changes | Morning Brief / Focus / Review unchanged |
| Direct business system queries | Observations are the sole input |
| Pulse UI | Pulse not built yet |

---

## How This Prepares Pulse

Pulse will consume `BusinessBrainResult` as structured input:

- `signals` → pulse indicators
- `patterns` → trend lines
- `attention` → founder focus areas
- `summary.overallPosture` → pulse state

The Observer's `pulse-api.ts` remains the observation read surface; the Brain adds the interpretation layer Pulse needs.

---

## How This Prepares Executive Rituals

Future ritual enrichment (not wired in 17B):

| Ritual | Brain input |
|--------|-------------|
| Morning Brief | `summary.headline` + top signals |
| Focus Mode | `attention` items filtered by severity |
| Weekly Review | `patterns` with trend `repeated` / `stable` |

Rituals continue using existing briefing builders until explicitly wired.

---

## Future Integration Notes

1. **Executive Briefing** — `buildExecutiveBriefing()` may consume `runBusinessBrain()` signals in Phase 17C+
2. **Observer bridge** — `lib/observer/briefing-bridge.ts` remains stub; Brain supersedes observation→briefing mapping
3. **Automation** — `observation.automation` + `signal.severity` will gate future rules
4. **Persistence** — Brain results are in-memory per process; future phases may persist snapshots

---

## Files Created

```
lib/business-brain/
  types.ts
  taxonomy.ts
  utils.ts
  signals.ts
  patterns.ts
  attention.ts
  summary.ts
  run.ts
  index.ts
```

## Files Modified

None — additive only.

---

## Example Output Shape

```json
{
  "generatedAt": "2026-06-25T12:00:00.000Z",
  "observationCount": 47,
  "signalCount": 6,
  "patternCount": 2,
  "attentionCount": 3,
  "signals": [
    {
      "id": "signal:business.delivery.pressure:portfolio",
      "taxonomy": "business.delivery.pressure",
      "label": "Delivery pressure",
      "meaning": "Upcoming deliverables are creating delivery pressure.",
      "severity": "moderate",
      "confidence": "high",
      "observationFingerprints": ["deliverables:threshold:due-soon:3"],
      "relatedClientId": null,
      "relatedClientName": null
    }
  ],
  "patterns": [
    {
      "id": "pattern:business.operations.load:blocked:work:state:item-blocked:12",
      "taxonomy": "business.operations.load",
      "label": "Repeated blocked work",
      "description": "Blocked work has appeared 3 times in observation history.",
      "trend": "repeated",
      "occurrenceCount": 3,
      "observationFingerprints": ["work:state:item-blocked:12"],
      "relatedClientId": 4,
      "relatedClientName": "Acme Corp"
    }
  ],
  "attention": [
    {
      "id": "attention:delivery-pressure",
      "title": "Upcoming deliverables may need review",
      "context": "Delivery pressure is present in the portfolio. Worth a calm review of what is due soon.",
      "severity": "moderate",
      "signalIds": ["signal:business.delivery.pressure:portfolio"],
      "patternIds": [],
      "relatedClientId": null,
      "relatedClientName": null
    }
  ],
  "summary": {
    "headline": "Business activity is present and understood.",
    "narrative": "The Business Brain has interpreted 6 signals across Delivery pressure, Operational load. Nothing requires immediate alarm.",
    "dominantThemes": ["Delivery pressure", "Operational load"],
    "overallPosture": "active",
    "criticalSignalCount": 0,
    "positiveSignalCount": 1
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

The Business Brain is the interpretation layer between raw observations and future executive experiences. It understands business context deterministically — calm, explainable, and ready for Pulse, rituals, and automation in subsequent phases.
