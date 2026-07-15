import { PRIMAL_CLIENT_SLUG } from "@/lib/ces/profile/primal";
import type {
  WebsiteWorkspacePageDefinition,
  WebsiteWorkspaceSectionDefinition,
  WebsiteWorkspaceSiteDefinition,
} from "./types";

function section(
  partial: WebsiteWorkspaceSectionDefinition,
): WebsiteWorkspaceSectionDefinition {
  return partial;
}

const PRIMAL_PAGES: WebsiteWorkspacePageDefinition[] = [
  {
    slug: "home",
    title: "Home",
    description: "First impression — hero, programs, and the path into the experience.",
    path: "/",
    lastUpdated: "2026-06-18",
    sections: [
      section({
        id: "hero",
        title: "Hero",
        fields: ["heading", "body", "cta", "image"],
        current: {
          heading: "Race-bred performance. Everyday precision.",
          body: "Primal Motorsports builds driver development, race programs, and high-performance experiences for people who take the craft seriously.",
          cta: "Explore programs",
          imageUrl: "/migrated-assets/projects/primal-motorsports-hero.jpg",
          imageAlt: "Primal Motorsports hero",
        },
      }),
      section({
        id: "driver-development",
        title: "Driver Development",
        fields: ["heading", "body", "cta"],
        current: {
          heading: "Driver development with intention",
          body: "From fundamentals to race readiness — structured coaching, measurable progress, and coaching that respects how serious drivers actually improve.",
          cta: "View Drive",
        },
      }),
      section({
        id: "programs",
        title: "Programs",
        fields: ["heading", "body", "cta"],
        current: {
          heading: "Programs built for the track",
          body: "Drive, Race, and Register pathways designed for progression — not generic motorsports marketing.",
          cta: "See Race programs",
        },
      }),
      section({
        id: "testimonials",
        title: "Testimonials",
        fields: ["heading", "body"],
        current: {
          heading: "Trusted by drivers who demand more",
          body: "Real feedback from drivers and teams who train, race, and prepare with Primal.",
        },
      }),
      section({
        id: "faq",
        title: "FAQ",
        fields: ["heading", "body"],
        current: {
          heading: "Questions, answered clearly",
          body: "How programs work, what to expect on day one, and how to choose the right path.",
        },
      }),
      section({
        id: "footer-cta",
        title: "Footer CTA",
        fields: ["heading", "body", "cta"],
        current: {
          heading: "Ready when you are",
          body: "Tell us where you are in your driving journey — we’ll point you to the right next step.",
          cta: "Contact Primal",
        },
      }),
    ],
  },
  {
    slug: "drive",
    title: "Drive",
    description: "Driver development pathways, coaching philosophy, and progression.",
    path: "/drive",
    lastUpdated: "2026-05-28",
    sections: [
      section({
        id: "hero",
        title: "Hero",
        fields: ["heading", "body", "cta", "image"],
        current: {
          heading: "Drive with purpose",
          body: "A focused environment for drivers who want sharper instincts, cleaner inputs, and confident progress.",
          cta: "Start your path",
          imageUrl: "/migrated-assets/projects/primal-motorsports-hero.jpg",
          imageAlt: "Drive program",
        },
      }),
      section({
        id: "curriculum",
        title: "Curriculum",
        fields: ["heading", "body"],
        current: {
          heading: "A curriculum that compounds",
          body: "Session structure, coaching cadence, and skills frameworks designed for lasting improvement.",
        },
      }),
      section({
        id: "coaching",
        title: "Coaching",
        fields: ["heading", "body", "cta"],
        current: {
          heading: "Coaching that tells the truth",
          body: "Direct feedback, track-aware instruction, and accountability without fluff.",
          cta: "Talk to a coach",
        },
      }),
      section({
        id: "footer-cta",
        title: "Footer CTA",
        fields: ["heading", "cta"],
        current: {
          heading: "Begin driver development",
          cta: "Register interest",
        },
      }),
    ],
  },
  {
    slug: "race",
    title: "Race",
    description: "Race programs, preparation, and competition pathways.",
    path: "/race",
    lastUpdated: "2026-06-02",
    sections: [
      section({
        id: "hero",
        title: "Hero",
        fields: ["heading", "body", "cta", "image"],
        current: {
          heading: "Race ready. Race serious.",
          body: "Competition pathways for drivers who want structure around prep, execution, and race-day decisions.",
          cta: "View race options",
          imageUrl: "/migrated-assets/projects/primal-motorsports-hero.jpg",
          imageAlt: "Race program",
        },
      }),
      section({
        id: "programs",
        title: "Programs",
        fields: ["heading", "body"],
        current: {
          heading: "Programs engineered for competition",
          body: "From first competitive steps to higher-stakes weekends — clear formats and serious standards.",
        },
      }),
      section({
        id: "prep",
        title: "Preparation",
        fields: ["heading", "body", "cta"],
        current: {
          heading: "Preparation is the advantage",
          body: "Setup discipline, mental readiness, and race craft that shows up when it matters.",
          cta: "Prepare to race",
        },
      }),
    ],
  },
  {
    slug: "register",
    title: "Register",
    description: "Registration and interest pathways for programs and events.",
    path: "/register",
    lastUpdated: "2026-04-30",
    sections: [
      section({
        id: "hero",
        title: "Hero",
        fields: ["heading", "body", "cta"],
        current: {
          heading: "Register your next step",
          body: "Choose a program path and send the details we need to place you correctly.",
          cta: "Continue registration",
        },
      }),
      section({
        id: "form-intro",
        title: "Form introduction",
        fields: ["heading", "body"],
        current: {
          heading: "What we need from you",
          body: "A short registration flow for experience level, preferred program, and timing.",
        },
      }),
      section({
        id: "assurance",
        title: "Assurance",
        fields: ["heading", "body"],
        current: {
          heading: "Handled with care",
          body: "Your details go straight to the Primal team — no anonymous ticket queue.",
        },
      }),
    ],
  },
  {
    slug: "inventory",
    title: "Inventory",
    description: "Public vehicle showroom presentation and listing storytelling.",
    path: "/inventory",
    lastUpdated: "2026-07-10",
    sections: [
      section({
        id: "hero",
        title: "Hero",
        fields: ["heading", "body", "cta", "image"],
        current: {
          heading: "Selected inventory",
          body: "Curated vehicles presented with the same standard Primal brings to the track.",
          cta: "Browse listings",
          imageUrl: "/migrated-assets/projects/primal-motorsports-hero.jpg",
          imageAlt: "Inventory showroom",
        },
      }),
      section({
        id: "listing-intro",
        title: "Listing introduction",
        fields: ["heading", "body"],
        current: {
          heading: "Every listing tells a clear story",
          body: "Price presentation, highlights, and specifications written for serious buyers.",
        },
      }),
      section({
        id: "cta",
        title: "Inquiry CTA",
        fields: ["heading", "body", "cta"],
        current: {
          heading: "Interested in a vehicle?",
          body: "Reach out directly — we’ll respond with clear next steps.",
          cta: "Contact about inventory",
        },
      }),
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    description: "Contact pathways, location cues, and response expectation.",
    path: "/contact",
    lastUpdated: "2026-03-12",
    sections: [
      section({
        id: "hero",
        title: "Hero",
        fields: ["heading", "body", "cta"],
        current: {
          heading: "Talk with Primal",
          body: "Questions about programs, racing, or inventory — send a clear note and we’ll respond.",
          cta: "Send a message",
        },
      }),
      section({
        id: "details",
        title: "Contact details",
        fields: ["heading", "body"],
        current: {
          heading: "How to reach us",
          body: "Email and phone paths for program inquiries, race questions, and inventory interest.",
        },
      }),
      section({
        id: "footer-cta",
        title: "Footer CTA",
        fields: ["heading", "cta"],
        current: {
          heading: "Prefer a direct conversation?",
          cta: "Call Primal",
        },
      }),
    ],
  },
];

const SITE_CATALOGS: Record<string, WebsiteWorkspaceSiteDefinition> = {
  [PRIMAL_CLIENT_SLUG]: {
    clientSlug: PRIMAL_CLIENT_SLUG,
    websiteUrl: "https://primalmotorsports.com",
    pages: PRIMAL_PAGES,
  },
};

export function getWebsiteWorkspaceSite(
  clientSlug: string | null | undefined,
): WebsiteWorkspaceSiteDefinition | null {
  if (!clientSlug) return null;
  return SITE_CATALOGS[clientSlug] ?? null;
}

export function getWebsiteWorkspacePage(
  clientSlug: string | null | undefined,
  pageSlug: string,
): WebsiteWorkspacePageDefinition | null {
  const site = getWebsiteWorkspaceSite(clientSlug);
  if (!site) return null;
  return site.pages.find((page) => page.slug === pageSlug) ?? null;
}

export function getWebsiteWorkspaceSection(
  clientSlug: string | null | undefined,
  pageSlug: string,
  sectionId: string,
): {
  page: WebsiteWorkspacePageDefinition;
  section: WebsiteWorkspaceSectionDefinition;
} | null {
  const page = getWebsiteWorkspacePage(clientSlug, pageSlug);
  if (!page) return null;
  const sectionDef = page.sections.find((item) => item.id === sectionId);
  if (!sectionDef) return null;
  return { page, section: sectionDef };
}

export function formatWorkspaceLastUpdated(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
