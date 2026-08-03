# Phase 2 Batch B — Visual QA checklist

**Status:** Login Welcomed visually confirmed locally · Authenticated Today dogfood remains for operator  
**Constitution checklist:** `docs/KXD-OS-CONSTITUTION.md` §16  
**Local login evidence (2026-08-03):** `http://localhost:3000/admin/login` shows KXD mark, “Your private studio”, “Enter your business. Today is waiting.”, Enter CTA — no CMS marketing.

## Required views

| View | Intent | Status |
|------|--------|--------|
| Desktop login | Welcomed KXD arrival | ✅ Confirmed in local browser |
| Desktop arrival / Today | Held shell, Clear Morning Answer, one primary move | Code + CSS ready; authenticated dogfood pending |
| Tablet | Hierarchy preserved; no crushed card grid | CSS 768px rules |
| Mobile | 30-second check: posture → primary → waiting → day shape | Arrival header depth/utilities hidden |
| Calm day | “You are clear this morning.” · spacious day | Deterministic recomposition + verifier |
| Busy / waiting | Waiting section only when items exist | Conditional render |
| Empty waiting | Silence — no empty Waiting card | Implemented |
| Partial calendar failure | Local schedule copy; Today does not collapse | `dayShapeLine` / `scheduleEmpty` |
| Login error | Alert associated with controls | `aria-describedby` + role=alert (code) |
| Successful login transition | “Entering your business…” loading | `today/loading.tsx` |

## Review checklist answers (Arrival → Today)

1. **Emotion owned:** Login Welcomed · Today Clear · Shell Held · Nav Effortless  
2. **First viewport creates emotion:** Posture line is visual lead before lists  
3. **One most important action:** `data-today-primary-move` CTA  
4. **Uncertainty removed:** Business posture, waiting truth, day shape  
5. **What disappeared:** Empty waiting card, empty signals, CMS marketing subtitle, encrypted-access theater on Today  
6. **Feels like KXD:** Private studio language; not dashboard  
7. **Product DNA:** Confidence before information; Today owns attention  
8. **Premium client respect:** No apology-required chrome in arrival path  
9. **Mental weight:** Reduced chrome + silence when calm  
10. **Would miss it:** Morning Answer + continuous Enter → Today handoff  

## Dogfood capture (operator)

When authenticated locally:

1. Open `/admin/login` — screenshot Welcomed arrival  
2. Sign in — note transition copy (no white flash)  
3. Land on `/admin/operations/today` — screenshot first viewport (no scroll)  
4. Resize to ~390px and ~834px — confirm hierarchy  
5. Confirm staff user still does not land on founder Today  

Store screenshots in an operator-private folder; do not commit production credentials or client data.
