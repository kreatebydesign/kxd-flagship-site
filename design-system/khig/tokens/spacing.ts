/**
 * KHIG Spacing Scale
 * 4px base — no arbitrary spacing
 */

const BASE = 4; // px

export const khigSpace = {
  /** 4px — icon gaps, tight inline spacing */
  micro: `${BASE}px`,
  /** 8px — inline elements, badge padding */
  small: `${BASE * 2}px`,
  /** 12px — compact list gaps */
  medium: `${BASE * 3}px`,
  /** 16px — default stack gap, card inner padding start */
  large: `${BASE * 4}px`,
  /** 24px — section internal padding */
  xl: `${BASE * 6}px`,
  /** 32px — section gaps */
  section: `${BASE * 8}px`,
  /** 40px — major section separation */
  page: `${BASE * 10}px`,
  /** 48px — page vertical padding */
  pageY: `${BASE * 12}px`,
  /** 64px — hero separation */
  hero: `${BASE * 16}px`,
} as const;

export const khigLayout = {
  /** Full operations page max */
  contentWidth: "72rem",
  /** Wide dashboard max */
  pageWidth: "80rem",
  /** Narrative / prose optimal reading width */
  readingWidth: "44rem",
  /** Narrow forms, side panels */
  narrowWidth: "42rem",
  /** Standard card padding */
  cardPadding: khigSpace.xl,
  /** Section vertical rhythm */
  sectionGap: khigSpace.section,
  /** Stack gap within sections */
  stackGap: khigSpace.large,
  /** Shell header height */
  headerHeight: "4.5rem",
} as const;

export const khigVerticalRhythm = {
  /** Label to content */
  labelToContent: khigSpace.medium,
  /** Heading to body */
  headingToBody: khigSpace.large,
  /** Paragraph to paragraph */
  paragraph: khigSpace.large,
  /** Section to section */
  section: khigSpace.section,
  /** Major briefing blocks */
  briefingBlock: khigSpace.page,
} as const;
