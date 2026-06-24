/**
 * KXD Academy missions — static challenge cards for youth edition.
 * Phase 3: completion tracking and rewards.
 */

export type MissionDifficulty = "Easy" | "Medium" | "Hard";

export type AcademyMission = {
  id: string;
  title: string;
  difficulty: MissionDifficulty;
  estimatedTime: string;
  learnPoints: string[];
  track: "Opportunity Hunter" | "Website Detective" | "Brand Spotter" | "Growth";
};

export const ACADEMY_MISSIONS: AcademyMission[] = [
  {
    id: "outdated-websites",
    title: "Find 3 businesses with outdated websites",
    difficulty: "Easy",
    estimatedTime: "30 min",
    track: "Website Detective",
    learnPoints: [
      "What makes a website feel old or neglected",
      "How to spot businesses that could use a premium redesign",
      "What to write down when you find a strong opportunity",
    ],
  },
  {
    id: "spot-five-problems",
    title: "Spot 5 website problems on one site",
    difficulty: "Medium",
    estimatedTime: "25 min",
    track: "Website Detective",
    learnPoints: [
      "Homepage clarity and first impressions",
      "Missing calls-to-action",
      "Mobile layout issues",
      "Trust signals that feel weak",
    ],
  },
  {
    id: "compare-logos",
    title: "Compare two logos and pick the stronger brand",
    difficulty: "Easy",
    estimatedTime: "20 min",
    track: "Brand Spotter",
    learnPoints: [
      "What makes a logo feel professional vs. amateur",
      "Consistency across a business's online presence",
      "How brand quality shows up before you read a single word",
    ],
  },
  {
    id: "missing-reviews",
    title: "Find a business missing Google reviews",
    difficulty: "Easy",
    estimatedTime: "20 min",
    track: "Growth",
    learnPoints: [
      "Why reviews matter for local businesses",
      "How weak reputation signals create opportunity",
      "Connecting trust gaps to what KXD can improve",
    ],
  },
  {
    id: "needs-seo",
    title: "Identify a company that needs SEO help",
    difficulty: "Medium",
    estimatedTime: "30 min",
    track: "Growth",
    learnPoints: [
      "Quick checks: page titles, local listings, content depth",
      "When search visibility is the real problem",
      "How SEO fits into KXD growth work",
    ],
  },
  {
    id: "strong-opportunity",
    title: "Find one business KXD could genuinely help",
    difficulty: "Medium",
    estimatedTime: "35 min",
    track: "Opportunity Hunter",
    learnPoints: [
      "What makes a discovery worth submitting",
      "Matching the business to websites, branding, or SEO",
      "Warning signs that mean it's probably not a fit",
    ],
  },
];
