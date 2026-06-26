# KXD OS Design System 1.0

Visual foundation for KXD OS — the operating system of a luxury creative company.

**Scope:** `/admin/operations` and future internal OS surfaces.  
**Not applied to:** public KXD website (`app/(site)`).

Phase 1 builds tokens and primitives only. Page redesigns follow the [Visual Manifesto](./KXD-OS-VISUAL-MANIFESTO.md).

---

## Principles

Calm · confident · spacious · precise · minimal · expensive · intentional

Avoid: loud · busy · technical · hacky · template-based

---

## Source of truth

| Layer | Path |
|-------|------|
| TypeScript tokens | `design-system/os/tokens/` |
| CSS variables & classes | `design-system/os/styles/kxd-os.css` |
| React primitives | `components/os/` |
| Token barrel | `design-system/os/index.ts` |
| Component barrel | `components/os/index.ts` |

CSS is loaded via `app/admin/operations/layout.tsx` only.

---

## Tokens

### Colors — layered blacks (never pure `#000` canvas)

- `bg.canvas` → `#070707`
- `bg.surface` / `elevated` / `floating` / `panel` / `muted`
- Text: `primary`, `secondary`, `muted`, `faint`
- Gold: `accent`, `soft`, `whisper`, `border`, `glow` — restraint over saturation
- Semantic: `critical`, `warning`, `success`, `info` (+ muted backgrounds)

### Typography

Display · Hero · Title · Section (label) · Card Title · Body · Meta · Caption

Serif: Cormorant (presence). Sans: Outfit (precision). OS UI uses sentence-case rhythm, not marketing uppercase.

### Spacing

4px base: `1`–`24` scale + layout constants (`pageMax`, `sectionGap`, etc.)

### Radius

`sm` 6px · `md` 8px · `lg` 12px · `xl` 16px · `full`

### Elevation

`flat` · `raised` · `floating` · `focus` — soft shadows, hairline borders

### Motion

150–200ms glide easing. Fade, lift, scale. Respects `prefers-reduced-motion`.

---

## Primitives

### Layout

- `KxdShell` — full viewport canvas
- `KxdPage` — max-width page container
- `KxdHeader` — sticky blurred header
- `KxdSection` — labeled section block

### Surfaces

- `KxdSurface` — variants: `default`, `panel`, `floating`, `raised`, `glass`
- `KxdCard` — metric/card padding surface
- `KxdMetric` — KPI label / value / sub

### Actions

- `KxdButton` — `primary`, `secondary`, `ghost`, `danger`; sizes `md`, `sm`, `icon`; `loading`

### Badges

`KxdBadge` variants: `health`, `tier`, `status`, `priority`, `pending`, `revenue`, `opportunity`, `critical`, `warning`, `success`

### Forms

`KxdField`, `KxdLabel`, `KxdInput`, `KxdTextarea`, `KxdSearch`, `KxdSelect`, `KxdCheckbox`, `KxdRadio`, `KxdToggle`, `KxdDateInput`

### Data display

`KxdTable` (+ head/body/row/cell), `KxdTabs`, `KxdEmptyState`

### Icons

`KxdIcon` — standardized stroke width and sizes (`xs`–`lg`)

---

## Usage

```tsx
import { KxdShell, KxdPage, KxdMetric, KxdButton } from "@/components/os";
import { osColors, osTypography } from "@/design-system/os";
```

```tsx
<KxdShell>
  <KxdPage>
    <KxdMetric label="Portfolio MRR" value="$12,400" sub="Tracked monthly revenue" />
    <KxdButton variant="primary">Launch Client</KxdButton>
  </KxdPage>
</KxdShell>
```

---

## Relationship to site design system

`design-system/tokens/` remains the public marketing site DNA.  
`design-system/os/` is the executive product layer — calmer, more spacious, less uppercase aggression.

---

## Rollout phases

1. **Design System 1.0** (this) — tokens + primitives
2. Client Portfolio rebuild
3. Client Workspace rebuild
4. Operations dashboards rebuild
5. Remaining OS surfaces
