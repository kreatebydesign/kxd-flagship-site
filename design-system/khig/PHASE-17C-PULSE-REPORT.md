# Phase 17C — Pulse Engine Foundation Report

**Edition 1 · Executive State**  
**Date:** June 25, 2026  
**Scope:** Deterministic pulse from Business Brain + observation history — no UI, rituals, automation, or briefing changes.

---

## Purpose

Phase 17C introduces the **Pulse Engine** — the layer that answers:

> **"What changed, what matters, and what deserves awareness right now?"**

| Layer | Question |
|-------|----------|
| Observer (17A) | What happened? |
| Business Brain (17B) | What does it mean? |
| **Pulse (17C)** | **What changed, what matters, what deserves awareness?** |

Pulse is **not** AI, **not** Executive Intelligence, and **not** the Morning Brief. It is the continuously generated executive state of the business — descriptive only.

---

## Architecture

```
Business Systems
      ↓
   Observer (17A)
      ↓
Observation Registry + History
      ↓
Business Brain (17B)
      ↓
Pulse Engine (17C)  ← this phase
      ↓
Executive Narrative / Rituals
      ↓
Future Automation
```

**Entry point:**

```typescript
import { runPulse } from "@/lib/pulse";

const result = await runPulse();
```

---

## Responsibilities

Pulse determines:

- What changed since the last run?
- What is new?
- What is stable?
- What deserves awareness?
- What deserves continued watching?

**Examples (descriptive only):**

- Delivery pressure increased
- Review backlog decreased
- Client engagement improving
- Operational load stable
- Communication activity increased
- Business quiet today
- Multiple meaningful changes occurred
- No significant movement detected

**Pulse never recommends:**

- Contact client
- Assign work
- Send email
- Automate task

---

## Data Flow

```
runPulse()
  → runBusinessBrain()        // consumes Observer internally
  → getLatestRegistry()       // observation count
  → getObservationHistory()   // delta, repeated, stable, novel
  → buildPulseChanges()
  → buildPulseWatchlist()
  → buildStableSignals()
  → buildExecutivePriorities()
  → buildBusinessPosture()
  → buildExecutiveDigest()
  → buildPulseItems()
  → PulseResult
```

No direct business system queries. No duplicate Observer or Business Brain logic.

---

## Inputs

| Input | Source |
|-------|--------|
| Business Brain result | `runBusinessBrain()` |
| Previous brain snapshot | In-process memory (change detection) |
| Observation registry | `getLatestRegistry()` |
| History delta | `history.delta(lastPulseAt)` |
| Repeated fingerprints | `history.repeated()` |
| Stable fingerprints | `history.stable(3)` |
| Novel fingerprints | `history.novel()` |

---

## Outputs

```typescript
type PulseResult = {
  generatedAt: string;
  pulseItems: PulseItem[];
  changes: PulseChange[];
  watchlist: PulseWatchItem[];
  stableSignals: StableSignal[];
  priorities: ExecutivePriority[];
  posture: BusinessPosture;
  executiveDigest: ExecutiveDigest;
};
```

### PulseChange — what shifted

| Direction | Meaning |
|-----------|---------|
| `new` | Signal or observation appeared |
| `resolved` | Signal no longer present |
| `increased` | Severity rose vs previous pulse |
| `decreased` | Severity eased vs previous pulse |
| `unchanged` | No significant movement |

### PulseWatchItem — continued watching

Examples:

- Delivery pressure remains elevated
- Review backlog continuing for 5 runs
- Relationship activity increasing
- Operational load increasing

### StableSignal — holding steady

Areas persisting across recent observation runs — execution momentum, clear queues, consistent patterns.

### ExecutivePriority — attention domains (not actions)

| Domain | Example context |
|--------|-----------------|
| Delivery | Timelines and commitments deserve awareness |
| Operations | Execution load is an active domain |
| Relationships | Client engagement is part of posture |
| Financial Health | Business health indicators visible |
| Reviews | Review volume part of current state |
| Communications | Threads part of executive landscape |
| Brand | Memory lifecycle being tracked |
| Marketing | Growth activity may warrant awareness |

### BusinessPosture — overall descriptive state

| Level | When |
|-------|------|
| Quiet | Few observations, no signals |
| Stable | Steady patterns, minimal change |
| Active | Normal interpreted activity |
| Busy | Multiple active domains |
| Elevated | Pressure in one or more areas |
| Critical | Critical signals present |

### ExecutiveDigest — structured summary

| Field | Purpose |
|-------|---------|
| `headline` | One-line executive state |
| `narrative` | Calm prose summary |
| `topChanges` | What shifted |
| `watchItems` | What to keep watching |
| `stableAreas` | What is holding |
| `overallTone` | calm · neutral · alert · urgent |

Foundation for future Morning Brief — not wired in 17C.

---

## What It Intentionally Does Not Do

| Excluded | Reason |
|----------|--------|
| UI rendering | Foundation only |
| Morning Brief / Focus / Review changes | Future ritual integration |
| Executive Narrative changes | Future phase |
| Automation execution | Future Automation Engine |
| Task creation | Future phases |
| Notifications | Future phases |
| Recommendations | Pulse describes state only |
| Direct business system queries | Brain + history are sole inputs |

---

## Future Executive Ritual Integration

| Ritual | Pulse input (future) |
|--------|----------------------|
| Morning Brief | `executiveDigest.headline` + `topChanges` |
| Focus Mode | `priorities` + `watchlist` filtered by severity |
| Weekly Review | `changes` + `stableSignals` + posture trend |

Rituals continue using existing builders until explicitly wired.

---

## Future Automation Integration

| Pulse output | Automation use (future) |
|--------------|-------------------------|
| `posture.level === "critical"` | Gate automation rules |
| `changes` with `direction: "new"` | Trigger evaluation |
| `watchlist` duration | Escalation thresholds |
| `priorities` weight | Domain routing |

Automation will consume Pulse — Pulse will never execute automation.

---

## Files Created

```
lib/pulse/
  types.ts
  utils.ts
  changes.ts
  watchlist.ts
  stability.ts
  priorities.ts
  posture.ts
  digest.ts
  items.ts
  run.ts
  index.ts
```

## Files Modified

None — additive only. Observer and Business Brain unchanged.

---

## Example Output Shape

```json
{
  "generatedAt": "2026-06-25T12:00:00.000Z",
  "pulseItems": [
    {
      "id": "pulse-item:change:pulse-change:increased:business.delivery.pressure",
      "kind": "change",
      "title": "Delivery pressure increased",
      "description": "Delivery pressure has increased — delivery pressure is more pronounced than the previous pulse.",
      "significance": "moderate",
      "taxonomy": "business.delivery.pressure",
      "relatedClientId": null,
      "relatedClientName": null
    }
  ],
  "changes": [
    {
      "id": "pulse-change:increased:business.delivery.pressure",
      "taxonomy": "business.delivery.pressure",
      "label": "Delivery pressure increased",
      "description": "Delivery pressure has increased — delivery pressure is more pronounced than the previous pulse.",
      "direction": "increased",
      "significance": "moderate",
      "signalIds": ["signal:business.delivery.pressure:portfolio"],
      "observationFingerprints": ["deliverables:threshold:due-soon:3"]
    }
  ],
  "watchlist": [
    {
      "id": "pulse-watch:business.delivery.pressure",
      "label": "Delivery pressure remains elevated",
      "context": "Upcoming deliverables are creating delivery pressure.",
      "durationRuns": 4,
      "severity": "moderate",
      "taxonomy": "business.delivery.pressure",
      "signalIds": ["signal:business.delivery.pressure:portfolio"],
      "patternIds": []
    }
  ],
  "stableSignals": [
    {
      "id": "pulse-stable:work:completed-today:2",
      "label": "Stable execution momentum",
      "description": "2 work items completed today — consistent across 3 recent runs.",
      "taxonomy": "business.execution.momentum",
      "observationFingerprints": ["work:completed-today:2"],
      "runCount": 3
    }
  ],
  "priorities": [
    {
      "id": "pulse-priority:delivery",
      "domain": "delivery",
      "label": "Delivery",
      "context": "Delivery timelines and upcoming commitments deserve executive awareness.",
      "weight": 50,
      "signalIds": ["signal:business.delivery.pressure:portfolio"],
      "patternIds": []
    }
  ],
  "posture": {
    "level": "active",
    "label": "Active",
    "description": "Business is active with 4 interpreted signals. 1 change since the last pulse."
  },
  "executiveDigest": {
    "headline": "Business is active.",
    "narrative": "Delivery pressure has increased — delivery pressure is more pronounced than the previous pulse. Delivery pressure remains elevated remains on the watchlist.",
    "topChanges": ["Delivery pressure has increased — delivery pressure is more pronounced than the previous pulse."],
    "watchItems": ["Delivery pressure remains elevated"],
    "stableAreas": ["Stable execution momentum"],
    "overallTone": "neutral"
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

The Pulse Engine is the executive state layer between structured business understanding and future narrative experiences. It describes what changed and what deserves awareness — calmly, deterministically, and without prescriptive recommendations.
