# Phase 17E — Business Context Foundation Report

**Edition 1 · Interpretation Context**  
**Date:** June 25, 2026  
**Scope:** Durable business context layer — no UI, ritual wiring, automation, or AI.

---

## Purpose

Phase 17E introduces **Business Context** — the layer that allows KXD OS to understand that every business is different.

> The same event can mean different things depending on business model, operating rhythm, priorities, goals, maturity, and success definitions.

Business Context provides **interpretation context**. It does not replace observations or override facts.

| Layer | Role |
|-------|------|
| Observer | Records facts |
| Business Brain | Interprets meaning |
| Pulse | Detects movement |
| Executive Narrative | Explains state to founder |
| **Business Context** | **Shapes how meaning is understood per business** |

---

## Core Principle

**Example:**

| Stage | Output |
|-------|--------|
| Observation (fact) | "3 projects are delayed." |
| Without context | "Delivery pressure exists." |
| Agency context | "Delivery capacity may need awareness." |
| Construction context | "Schedule variance may impact commitments." |
| Restaurant context | "Launch timeline risk may require attention." |

Same fact. Different business meaning.

---

## Architecture

```
Business Context (17E)
      ↓ (future reference)
Observer → Business Brain → Pulse → Executive Narrative → Rituals
```

**Entry point:**

```typescript
import { loadBusinessContext, interpretWithContext } from "@/lib/business-context";

const context = loadBusinessContext();

const interpreted = interpretWithContext(context, {
  pattern: "delivery.delay",
  genericMeaning: "Delivery pressure exists.",
});
```

---

## Business Context Model

```typescript
type BusinessContext = {
  id: string;
  businessName?: string;
  industry?: string;
  businessModel?: BusinessModel;
  operatingStyle?: OperatingStyle;
  maturity?: BusinessMaturity;
  priorities: BusinessPriority[];
  goals: BusinessGoal[];
  importantDomains: BusinessDomain[];
  successIndicators: SuccessIndicator[];
  createdAt: string;
  updatedAt: string;
};
```

### BusinessModel

`creative-agency` · `construction` · `restaurant` · `professional-services` · `retail` · `saas` · `custom`

### OperatingStyle

`founder-led` · `team-operated` · `project-based` · `retainer-based` · `seasonal` · `launch-driven`

### BusinessDomainKey

Aligned with Pulse executive priority domains for future integration.

---

## What It Provides

| Capability | Function |
|------------|----------|
| Default studio context | `KXD_STUDIO_BUSINESS_CONTEXT` |
| Reference presets | Agency, construction, restaurant opening |
| Schema normalization | `normalizeBusinessContext()` |
| Interpretation lenses | `interpretWithContext()` |
| Domain weighting | `contextWeightForDomain()` |
| Context summary | `summarizeBusinessContext()` |

---

## What It Intentionally Does Not Do

| Excluded | Reason |
|----------|--------|
| UI / configuration screens | Foundation only |
| Database persistence | In-process context for 17E |
| Observer changes | Facts remain unchanged |
| Brain / Pulse / Narrative wiring | Future integration phase |
| Ritual changes | Not wired in 17E |
| Automation | Future phase |
| Large configuration system | Lightweight durable model only |
| AI generation | Deterministic lenses only |

---

## Future Integration Notes

1. **Business Brain** — `interpretWithContext()` can reframe signal meanings per `businessModel`
2. **Pulse** — `contextWeightForDomain()` can weight watchlist and priorities
3. **Executive Narrative** — `summarizeBusinessContext()` can open narrative with business framing
4. **Executive Rituals** — Morning Brief can reference goals and success indicators
5. **Persistence** — Future phase may store context in Payload without changing read APIs

---

## Files Created

```
lib/business-context/
  types.ts
  schema.ts
  defaults.ts
  domains.ts
  context.ts
  loader.ts
  index.ts
```

## Files Modified

None — additive only.

---

## Example

```typescript
import {
  loadBusinessContext,
  interpretWithContext,
  CONSTRUCTION_CONTEXT,
  setBusinessContext,
} from "@/lib/business-context";

// Default — KXD studio
const studio = loadBusinessContext();

interpretWithContext(studio, {
  pattern: "delivery.delay",
  genericMeaning: "Delivery pressure exists.",
});
// → "Delivery capacity may need awareness."

// Construction preset
setBusinessContext(CONSTRUCTION_CONTEXT);

interpretWithContext(loadBusinessContext(), {
  pattern: "delivery.delay",
  genericMeaning: "Delivery pressure exists.",
});
// → "Schedule variance may impact commitments."
```

---

## Build Status

```
npm run build — PASSED (Next.js 16.2.7, TypeScript clean)
```

---

## Conclusion

Business Context is the durable interpretation layer that future intelligence systems can reference. It keeps facts honest while allowing KXD OS to speak in the language of each business.
