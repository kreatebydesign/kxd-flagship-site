# KHIG Part 7 — Component Audit

Inventory of reusable KXD OS components. All live in `components/os/` unless noted.

**Rule:** Extend these primitives. Do not invent parallel patterns.

---

## Buttons (`KxdButton`)

| Variant | Purpose | When to use | When not to use |
|---------|---------|-------------|-----------------|
| primary | Main action | One per context — "Take action", "Save" | Multiple per row |
| secondary | Supporting action | "Copy link", secondary paths | Primary decision |
| ghost | Tertiary / inline | Navigation-adjacent, low emphasis | Destructive actions |
| danger | Destructive | Delete, irreversible | Any non-destructive action |

**Sizes:** md (default), sm (compact lists), icon (toolbar).

---

## Inputs (`KxdInput`, `KxdTextarea`, `KxdSearch`, `KxdDateInput`, `KxdSelect`)

**Purpose:** Form data entry with consistent focus and border treatment.

**When to use:** Payload-adjacent forms, operations filters.  
**When not to use:** Display-only data — use typography.

---

## Cards (`KxdCard`, `KxdSurface`)

| Variant | Purpose |
|---------|---------|
| default | Standard grouped content |
| panel | Inset section |
| raised | Emphasized object |
| floating | Modal-adjacent |
| glass | Editorial briefing surfaces |

**When to use:** One thought per card.  
**When not to use:** List rows, navigation.

---

## Tables (`KxdTable`)

**Purpose:** Dense tabular data when columns are required.

**When to use:** Financial data, admin record lists.  
**When not to use:** Executive briefings — prefer `OpsListRow`.

---

## Lists

| Component | Location | Purpose |
|-----------|----------|---------|
| `OpsListRow` | `components/admin/operations/shared/OpsBriefing.tsx` | Linked briefing rows |
| `KxdTable` | `components/os/` | Tabular data |

**When to use lists:** What Changed, priorities, risks — scannable rows with rhythm.

---

## Badges (`KxdBadge`)

| Variant | Purpose |
|---------|---------|
| default | Neutral status |
| success | Healthy, complete |
| warning | Attention |
| critical | Urgent, blocked |
| status | In-progress states |
| health | Health scores |

**Rule:** Badges label state — they do not replace sentences.

---

## Pills (`OpsFocusPill`, `OpsStatusBadge`)

**Purpose:** Quiet status in briefing contexts.  
**When not to use:** More than 2–3 per row.

---

## Metrics (`KxdMetric`, `OpsKpiStrip`)

**Purpose:** Hero numbers — KPI strips, health scores.  
**Typography:** Metric scale (serif, large).  
**When not to use:** Every data point — reserve for L1 situation.

---

## Charts

**Status:** No dedicated KXD OS chart component in Edition 1.  
**Rule:** Future charts must use muted palette, no chartjunk, serif titles.

---

## Navigation

| Component | Purpose |
|-----------|---------|
| `OperationsShell` | Operations layout + nav |
| `NAV_GROUPS` | Briefing, Clients, Studio, Intelligence nav |
| `KxdTabs` | In-page section tabs — use sparingly |

**Rule:** Navigation stays visually subordinate to content.

---

## Dialogs / Modals

**Status:** Payload admin modals + future KXD OS modals.  
**KHIG rule:** Overlay scrim + floating elevation + 220ms glide. Max one modal deep.

---

## Drawers

**Status:** Not standardized in Edition 1. Future: slide from right, lighter scrim than modal.

---

## Dropdowns

**Status:** Native `KxdSelect` for forms. Custom dropdowns: match surface.elevated + floating shadow.

---

## Forms (`KxdField`, `KxdLabel`, `KxdCheckbox`, `KxdRadio`, `KxdToggle`)

**Purpose:** Accessible form composition.  
**Rule:** Label above field. Error below in critical semantic color.

---

## Status Indicators

| Component | Use |
|-----------|-----|
| `KxdBadge` | Inline status |
| `OpsStatusBadge` | Briefing contexts |
| Platform status list | Module health (Intelligence page) |

---

## Intelligence-Specific Components (Edition 1 reference)

| Component | Purpose |
|-----------|---------|
| `ExecutiveNarrativeBlock` | L1 narrative hero |
| `ExecutiveHealthSummary` | Health strip |
| `PrimaryRecommendation` | L2 decision |
| `RecommendationCard` | Enriched recommendation |
| `ExecutiveInsights` | L3 observations |
| `NarrativeSection` | Subdued supporting sections |

These set the **editorial standard** for future screens.

---

## Empty States (`KxdEmptyState`, `OpsEmpty`)

**Purpose:** Honest calm when no data.  
**Voice:** See [08-product-language.md](./08-product-language.md).

---

*Next: [08-product-language.md](./08-product-language.md)*
