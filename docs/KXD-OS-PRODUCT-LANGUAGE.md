# KXD OS Product Language

**Status:** Permanent copy standard for Edition 1  
**Audience:** Engineers, designers, and AI assistants shipping user-facing UI  
**Companion:** `docs/KXD-EXPERIENCE-STANDARD-V1.md`, `docs/KXD-OS-CONSTITUTION.md`, `docs/KXD-OS-VISUAL-MANIFESTO.md`

---

## Voice

KXD OS should read like premium studio software from Kreate by Design: clear, modern, confident, and human. Prefer plain words that describe what the screen does. Avoid drama, buzzwords, and generic AI phrasing.

Sentence case for titles and actions. One lead sentence per hero when possible.

---

## Avoid in user-facing copy

Do not use military, tactical, or combat-inspired product language, including:

- Command Center (as OS or feature marketing)
- Cockpit
- Mission Control
- War Room
- Battle Plan
- Arsenal
- Tactical Operations
- Deploy Troops
- Conquer / Dominate
- Similar aggressive or “operations theater” framing

**Exception:** Standard UX patterns such as a **command palette** (search shortcut) are fine; label them as **Search** or **Search KXD OS**, not “command search.”

Do not use cockpit language for platform or founder surfaces.

---

## Preferred vocabulary

Choose words that match the feature:

| Concept | Preferred terms |
|--------|------------------|
| Start of day | Today |
| Per-client HQ | Client workspace, Overview (tab) |
| Portfolio | Clients, portfolio |
| Progress / health | Platform Progress, system health, completion |
| Money | Financial overview, revenue, billing |
| Insight | Insights, intelligence, analytics |
| Execution | Work, Work Board, projects |
| Planning | Strategy, planning, roadmap |

Avoid repeating the same generic label on every screen.

---

## Technical names vs visible copy

- **Do not** rename routes, APIs, database tables, permissions, or module slugs only to change wording (e.g. keep `/admin/operations/client-command`, `lib/client-command/`, timeline `sourceModule: "Client Command"`).
- **Do** change labels, headings, leads, empty states, notifications, and Payload `admin.description` text that founders and staff read.
- **Per-client HQ (staff):** **Clients** (hub), **Client workspace** (per-client depth), **Overview** (primary tab). Do not use “Client Command” or “Command Center” in UI.
- **Internal module codenames** (e.g. Network Command, Lead Command) may remain in code; user-facing surfaces use **Network**, **Leads**, or **client workspace** as appropriate.

---

## Examples

| Instead of | Use |
|------------|-----|
| Internal engineering cockpit for… | Track platform development, completed features, upcoming improvements, and overall system health. |
| Executive command center | Client workspace |
| Financial command (panel title) | Financial overview |
| Open Command Center (action) | Open client workspace |
| Integration consumer “Command Center” | Operations |

---

## Before shipping UI copy

1. Does this sound like Kreate by Design premium software?
2. Is it specific to what the user is doing?
3. Would this appear on the kill list in the Experience Constitution?
4. If unsure, check this doc and `docs/KXD-EXPERIENCE-STANDARD-V1.md` §2.
