/**
 * Executive Review — living leadership presentation pack.
 * Narrative spine + curated evidence. Not a dashboard.
 */

export type ExecutiveReviewStatus = "built" | "in-progress" | "future";

export type ExecutiveReviewProvenance =
  | "live"
  | "prepared"
  | "awaiting";

export type ExecutiveReviewChapterId =
  | "opening"
  | "foundation"
  | "platform"
  | "demand"
  | "workspace"
  | "impact"
  | "roadmap"
  | "vision";

export type ExecutiveReviewMediaFrame = {
  id: string;
  src: string;
  alt: string;
  caption: string;
  label?: string;
  status?: ExecutiveReviewStatus;
};

export type ExecutiveReviewMetric = {
  id: string;
  label: string;
  value: string;
  note?: string;
};

export type ExecutiveReviewSeriesPoint = {
  label: string;
  value: number;
  secondary?: number;
};

export type ExecutiveReviewChart = {
  id: string;
  title: string;
  summary: string;
  periodLabel: string;
  primaryLabel: string;
  secondaryLabel?: string;
  points: ExecutiveReviewSeriesPoint[];
};

export type ExecutiveReviewEvidencePanel = {
  id: string;
  title: string;
  lead: string;
  provenance: ExecutiveReviewProvenance;
  provenanceLabel: string;
  metrics: ExecutiveReviewMetric[];
  themes?: string[];
  chart?: ExecutiveReviewChart;
  note?: string;
  emptyState?: string;
};

export type ExecutiveReviewPillar = {
  id: string;
  number: string;
  title: string;
  body: string;
  status: ExecutiveReviewStatus;
};

export type ExecutiveReviewCapability = {
  id: string;
  title: string;
  outcome: string;
  href: string;
  hrefLabel: string;
  media: ExecutiveReviewMediaFrame;
  status: ExecutiveReviewStatus;
};

export type ExecutiveReviewEngine = {
  id: string;
  title: string;
  body: string;
};

export type ExecutiveReviewRoadmapItem = {
  id: string;
  title: string;
  body: string;
  status: ExecutiveReviewStatus;
};

export type ExecutiveReviewRoadmapLane = {
  id: "now" | "next" | "later";
  title: string;
  items: ExecutiveReviewRoadmapItem[];
};

export type ExecutiveReviewChapter = {
  id: ExecutiveReviewChapterId;
  railLabel: string;
  eyebrow: string;
  title: string;
  lead: string;
  paragraphs: string[];
  takeaway: string;
  status?: ExecutiveReviewStatus;
};

export type ExecutiveReviewGlance = {
  phase: string;
  focus: string;
  next: string;
  updated: string;
};

export type ExecutiveReviewJourneyColumn = {
  id: string;
  title: string;
  items: string[];
};

export type ExecutiveReviewTimelineStep = {
  id: string;
  label: string;
  current?: boolean;
};

export type ExecutiveReviewOngoingItem = {
  id: string;
  label: string;
};

export type ExecutiveReviewPack = {
  clientSlug: string;
  clientName: string;
  periodLabel: string;
  opening: {
    eyebrow: string;
    brand: string;
    headline: string;
    lead: string;
    contextLine: string;
    glance: ExecutiveReviewGlance;
  };
  chapters: ExecutiveReviewChapter[];
  timeline: ExecutiveReviewTimelineStep[];
  journey: {
    title: string;
    lead: string;
    before: ExecutiveReviewJourneyColumn;
    today: ExecutiveReviewJourneyColumn;
  };
  pillars: ExecutiveReviewPillar[];
  platformFrames: ExecutiveReviewMediaFrame[];
  demand: {
    highlight: {
      title: string;
      value: string;
      note: string;
    };
    supportingMetrics: ExecutiveReviewMetric[];
    search: ExecutiveReviewEvidencePanel;
    advertising: ExecutiveReviewEvidencePanel;
    domainStory: {
      title: string;
      body: string;
      primary: { domain: string; note: string };
      legacy: { domain: string; note: string };
    };
    analyticsEmpty: string;
  };
  capabilities: ExecutiveReviewCapability[];
  engines: ExecutiveReviewEngine[];
  ongoingWork: {
    title: string;
    body: string;
    items: ExecutiveReviewOngoingItem[];
    status: ExecutiveReviewStatus;
  };
  roadmapLanes: ExecutiveReviewRoadmapLane[];
  vision: {
    rings: Array<{ id: string; label: string; status: ExecutiveReviewStatus; body: string }>;
    futureMedia: ExecutiveReviewMediaFrame;
    close: string;
  };
  heroImageSrc: string;
  heroImageAlt: string;
};
