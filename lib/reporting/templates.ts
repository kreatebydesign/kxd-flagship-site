import type { ReportSectionKey, ReportTemplateDefinition } from "./types";

export const BUILTIN_TEMPLATES: ReportTemplateDefinition[] = [
  {
    slug: "standard-monthly",
    title: "Standard Monthly Report",
    category: "standard",
    edition: "kxd-core",
    sections: [
      "executiveSummary",
      "workCompleted",
      "deliverables",
      "projects",
      "meetings",
      "websiteHealth",
      "infrastructure",
      "growth",
      "recommendations",
      "kpis",
      "timeline",
      "nextMonthPriorities",
    ],
  },
  {
    slug: "website-care",
    title: "Website Care Report",
    category: "website-care",
    edition: "kxd-core",
    sections: [
      "executiveSummary",
      "workCompleted",
      "deliverables",
      "websiteHealth",
      "infrastructure",
      "kpis",
      "recommendations",
      "nextMonthPriorities",
    ],
  },
  {
    slug: "seo-report",
    title: "SEO Report",
    category: "seo",
    edition: "kxd-core",
    sections: ["executiveSummary", "seo", "websiteHealth", "growth", "recommendations", "kpis"],
  },
  {
    slug: "growth-report",
    title: "Growth Report",
    category: "growth",
    edition: "kxd-core",
    sections: ["executiveSummary", "growth", "recommendations", "kpis", "nextMonthPriorities"],
  },
  {
    slug: "campaign-report",
    title: "Campaign Report",
    category: "campaign",
    edition: "campaign-os",
    sections: ["executiveSummary", "workCompleted", "deliverables", "growth", "kpis", "timeline"],
  },
  {
    slug: "motorsports-report",
    title: "Motorsports Report",
    category: "motorsports",
    edition: "motorsports-os",
    sections: ["executiveSummary", "projects", "deliverables", "timeline", "kpis"],
  },
  {
    slug: "contractor-report",
    title: "Contractor Report",
    category: "contractor",
    edition: "contractor-os",
    sections: ["executiveSummary", "projects", "deliverables", "infrastructure", "kpis"],
  },
  {
    slug: "hospitality-report",
    title: "Hospitality Report",
    category: "hospitality",
    edition: "hospitality-os",
    sections: ["executiveSummary", "growth", "websiteHealth", "recommendations", "kpis"],
  },
];

export function getBuiltinTemplate(slug?: string): ReportTemplateDefinition {
  return BUILTIN_TEMPLATES.find((t) => t.slug === slug) ?? BUILTIN_TEMPLATES[0];
}

export function monthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function defaultReportTitle(clientName: string, month: number, year: number): string {
  return `${clientName} · ${monthLabel(month, year)} Executive Report`;
}
