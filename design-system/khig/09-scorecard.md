# KHIG Part 9 — Industrial Design Scorecard

Every future KXD OS screen is reviewed against this checklist before ship.

**Score each criterion A–F.**  
**Minimum ship grade: B** (no criterion below C).

---

## How to Score

| Grade | Meaning |
|-------|---------|
| **A** | Exemplary — reference quality, could ship in Apple keynote context |
| **B** | Ship-ready — meets KHIG with minor polish opportunities |
| **C** | Acceptable with documented fixes — do not ship without plan |
| **D** | Below standard — requires redesign pass |
| **F** | Fails — violates KHIG principles |

---

## Criteria

### 1. Visual Hierarchy
Does the screen follow L0–L5 information hierarchy?  
Can a founder identify situation → decision → evidence in under 30 seconds?

### 2. Reading Flow
Does the eye travel naturally top-to-bottom?  
Is prose constrained to reading width?

### 3. Whitespace
Does the screen breathe?  
Would removing 20% of padding make it feel cheaper?

### 4. Trust
Does every claim feel evidence-based?  
Are empty states honest?

### 5. Calmness
Is alert fatigue avoided?  
Are semantic colors used only when required?

### 6. Focus
Is there one primary decision per viewport?  
Is gold used as accent (< 3%)?

### 7. Accessibility
Contrast, focus rings, reduced motion, semantic HTML?

### 8. Consistency
Does it use `components/os/` primitives and KHIG tokens?  
Does it feel like the Intelligence page family?

### 9. Motion
Are transitions 140–320ms glide?  
No bounce, no flashy animation?

### 10. Typography
Serif for presence, sans for precision?  
Clear scale separation?

### 11. Executive Readability
Would a founder read this at 6am without squinting?  
Narrative-first where appropriate?

### 12. Visual Weight
Do important elements feel heavier?  
Is metadata visually subordinate?

### 13. Cognitive Load
Could anything be removed without losing meaning?  
Are there fewer than 5 competing focal points?

### 14. Overall Craftsmanship
Does it feel like one world-class team built one product?  
Would you be proud to show a client?

---

## Scorecard Template

```
Screen: _______________________
Reviewer: _____________________
Date: _________________________

| Criterion              | Grade | Notes |
|------------------------|-------|-------|
| Visual hierarchy       |       |       |
| Reading flow           |       |       |
| Whitespace             |       |       |
| Trust                  |       |       |
| Calmness               |       |       |
| Focus                  |       |       |
| Accessibility          |       |       |
| Consistency            |       |       |
| Motion                 |       |       |
| Typography             |       |       |
| Executive readability  |       |       |
| Visual weight          |       |       |
| Cognitive load         |       |       |
| Overall craftsmanship  |       |       |

Overall: ___  Ship: YES / NO
Exceptions documented: ___________
```

---

## Reference Screens (Edition 1)

Use these as **A-grade references** during future rebuilds:

| Screen | Path | Why |
|--------|------|-----|
| Intelligence | `/admin/operations/intelligence` | Narrative → health → decision → insights → detail |
| Review Workspace | `/admin/operations/review-inbox/[id]` | Editorial brief, calm operator actions |
| Work Engine | `/admin/operations/work` | Operational density without dashboard noise |

---

## Phase 16A Scope

This scorecard is **active immediately** for new work.  
Existing screens are **not** required to pass until their dedicated Industrial Design rebuild phase.

---

*Return to [README.md](./README.md)*
