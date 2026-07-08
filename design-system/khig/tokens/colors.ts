/**
 * KHIG Semantic Color System
 * Phase 16A — Design constitution tokens
 *
 * These tokens define PURPOSE. Implementation maps to --kxd-os-* CSS variables
 * and design-system/os/tokens/colors.ts during future alignment phases.
 *
 * Rule: Gold is accent (< 3% of any viewport). Application feels calm.
 */

export const khigColors = {
  /** Application Background — atmospheric base; the "room" the OS lives in */
  applicationBackground: {
    token: "application.background",
    value: "#1a1b1d",
    purpose: "Canvas layer. Cool titanium charcoal — never pure black.",
    emotion: "Grounded, substantial, calm",
  },

  /** Primary Surface — main content field */
  primarySurface: {
    token: "surface.primary",
    value: "#1f2022",
    purpose: "Page-level content area, slightly lifted from canvas.",
    emotion: "Focused workspace",
  },

  /** Secondary Surface — grouped content within a page */
  secondarySurface: {
    token: "surface.secondary",
    value: "#27282a",
    purpose: "Cards, panels, list containers.",
    emotion: "Organized, readable",
  },

  /** Elevated Surface — hover emphasis, raised objects */
  elevatedSurface: {
    token: "surface.elevated",
    value: "#2f3032",
    purpose: "Hovered rows, active panels, emphasized objects.",
    emotion: "Responsive, tactile",
  },

  /** Navigation Surface — shell sidebar, top bar */
  navigationSurface: {
    token: "surface.navigation",
    value: "#2b2c2e",
    purpose: "Persistent chrome — visually subordinate to content.",
    emotion: "Stable, unobtrusive",
  },

  /** Section Surface — inset areas within a page */
  sectionSurface: {
    token: "surface.section",
    value: "rgba(255, 255, 255, 0.02)",
    purpose: "Subtle grouping without heavy borders.",
    emotion: "Quiet structure",
  },

  /** Borders — default separation when depth is insufficient */
  border: {
    token: "border.default",
    value: "rgba(255, 255, 255, 0.05)",
    purpose: "Last-resort separation. Prefer luminance first.",
    emotion: "Neutral",
  },

  /** Subtle Borders — hairline dividers */
  borderSubtle: {
    token: "border.subtle",
    value: "rgba(255, 255, 255, 0.035)",
    purpose: "Section dividers, list separators.",
    emotion: "Barely there",
  },

  /** Primary Text — names, titles, decisions */
  textPrimary: {
    token: "text.primary",
    value: "#F5F6F8",
    purpose: "Headlines, client names, primary content.",
    emotion: "Clear, confident",
  },

  /** Secondary Text — supporting prose */
  textSecondary: {
    token: "text.secondary",
    value: "rgba(245, 246, 248, 0.74)",
    purpose: "Body copy, descriptions, reasons.",
    emotion: "Readable, calm",
  },

  /** Muted Text — metadata, timestamps */
  textMuted: {
    token: "text.muted",
    value: "rgba(245, 246, 248, 0.5)",
    purpose: "Captions, labels, secondary metadata.",
    emotion: "Quiet, non-competing",
  },

  /** Dividers — horizontal rules */
  divider: {
    token: "border.divider",
    value: "rgba(255, 255, 255, 0.035)",
    purpose: "Section breaks without boxing content.",
    emotion: "Breathing room",
  },

  /** Accent — champagne gold; reward only */
  accent: {
    token: "accent.primary",
    value: "#C2AA72",
    purpose: "Primary CTAs, earned emphasis, brand presence moments.",
    emotion: "Premium, rare, intentional",
    maxViewportPercent: 3,
  },

  /** Success — positive completion, healthy state */
  success: {
    token: "semantic.success",
    value: "#6fbf8f",
    purpose: "Completed work, healthy badges, positive insight tone.",
    emotion: "Reassuring, not celebratory",
  },

  /** Warning — attention needed, not emergency */
  warning: {
    token: "semantic.warning",
    value: "#d4af6a",
    purpose: "Elevated priority, needs attention soon.",
    emotion: "Measured urgency",
  },

  /** Critical — immediate decision required */
  critical: {
    token: "semantic.critical",
    value: "#e07070",
    purpose: "Blocked work, failed systems, true emergencies only.",
    emotion: "Clear alarm — use sparingly",
  },

  /** Information — neutral informational state */
  information: {
    token: "semantic.info",
    value: "rgba(150, 178, 214, 0.66)",
    purpose: "Informational badges, timeline references.",
    emotion: "Informative, cool",
  },

  /** Selection — selected row, active nav item */
  selection: {
    token: "interactive.selection",
    value: "rgba(255, 255, 255, 0.06)",
    purpose: "Selected list rows, active navigation.",
    emotion: "Clear without shouting",
  },

  /** Focus — keyboard focus ring */
  focus: {
    token: "interactive.focus",
    value: "rgba(245, 246, 248, 0.18)",
    purpose: "Accessibility focus indicator.",
    emotion: "Visible, calm",
  },

  /** Hover — interactive hover state */
  hover: {
    token: "interactive.hover",
    value: "rgba(255, 255, 255, 0.04)",
    purpose: "Row hover, button hover backgrounds.",
    emotion: "Responsive",
  },

  /** Pressed — active press state */
  pressed: {
    token: "interactive.pressed",
    value: "rgba(0, 0, 0, 0.12)",
    purpose: "Button pressed, toggle active.",
    emotion: "Settled weight",
  },

  /** Disabled — non-interactive elements */
  disabled: {
    token: "interactive.disabled",
    value: "rgba(245, 246, 248, 0.28)",
    purpose: "Disabled text and controls.",
    emotion: "Clearly inactive",
  },

  /** Overlay — scrim behind modals */
  overlay: {
    token: "overlay.scrim",
    value: "rgba(26, 27, 29, 0.86)",
    purpose: "Modal backdrop, drawer scrim.",
    emotion: "Focus isolation",
  },

  /** Modal Background — floating dialog surface */
  modalBackground: {
    token: "surface.modal",
    value: "#393a3c",
    purpose: "Modal and dialog content area.",
    emotion: "Elevated, authoritative",
  },

  /** Glass — translucent elevated surface */
  glass: {
    token: "surface.glass",
    value: "linear-gradient(165deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.012) 26%, transparent 58%)",
    purpose: "Briefing cards, intelligence surfaces — depth without heaviness.",
    emotion: "Refined, editorial",
  },
} as const;

export type KhigColorRole = keyof typeof khigColors;
