/**
 * Reusable KXD Journal feature block model.
 * Additive to standard Insights — used by format: "feature" articles only.
 */

export type JournalFigureBlock = {
  type: "figure";
  src: string;
  alt: string;
  caption?: string;
  layout?: "full" | "wide" | "split-left" | "split-right";
};

export type JournalProseBlock = {
  type: "prose";
  paragraphs: string[];
};

export type JournalHeadingBlock = {
  type: "heading";
  level?: 2 | 3;
  text: string;
};

export type JournalListBlock = {
  type: "list";
  ordered?: boolean;
  items: string[];
};

export type JournalCodeBlock = {
  type: "code";
  filePath: string;
  language?: string;
  code: string;
  caption?: string;
};

export type JournalUnderHoodBlock = {
  type: "under-the-hood";
  index: string;
  title: string;
  businessProblem: string;
  explanation: string[];
  flow?: string[];
  filePath?: string;
  code?: {
    language?: string;
    code: string;
  };
};

export type JournalDiagramBlock = {
  type: "diagram";
  id: "plate-architecture";
  caption?: string;
};

export type JournalSplitBlock = {
  type: "split";
  eyebrow?: string;
  title?: string;
  body: string[];
  figure: Omit<JournalFigureBlock, "type" | "layout">;
};

export type JournalBlock =
  | JournalProseBlock
  | JournalHeadingBlock
  | JournalListBlock
  | JournalFigureBlock
  | JournalCodeBlock
  | JournalUnderHoodBlock
  | JournalDiagramBlock
  | JournalSplitBlock;

export type JournalFeatureArticle = {
  slug: string;
  /** Visible H1 — may differ from SEO title */
  title: string;
  /** Visible deck / excerpt */
  excerpt: string;
  /** Search title if different from H1 */
  seoTitle: string;
  seoDescription: string;
  category: string;
  categoryLabel: string;
  editorialLabel: string;
  subjectLabel: string;
  author: string;
  publishedAt: string;
  readingTime: number;
  featured: boolean;
  keywords: string[];
  heroImage: {
    src: string;
    alt: string;
  };
  ogImage?: string;
  aboutTopics?: string[];
  /** No FinalCtaBand when false */
  showCta?: boolean;
  blocks: JournalBlock[];
};
