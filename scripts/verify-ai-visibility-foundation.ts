/**
 * Verify AI Visibility P1 foundation — canonical host, robots, schema helpers, AI classification.
 * Run: npx tsx scripts/verify-ai-visibility-foundation.ts
 */

import assert from "node:assert/strict";
import { classifyAiReferralSource } from "../lib/analytics/ai-referral.ts";
import { ANALYTICS_EVENTS } from "../lib/analytics/config.ts";
import { SITE } from "../lib/site.ts";
import { absolutePublicUrl } from "../lib/seo/public-routes.ts";
import { absoluteUrl } from "../lib/seo/metadata.ts";
import {
  faqPageSchema,
  founderPersonSchema,
  organizationSchema,
} from "../lib/seo/schema.ts";
import { STATIC_SERVICE_DETAILS } from "../lib/content/service-details.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function check(label: string, condition: boolean) {
  assert.equal(condition, true, label);
  console.log(`  ✓ ${label}`);
}

console.log("\nverify-ai-visibility-foundation\n");

// Canonical host
check(
  "SITE.url defaults to www",
  SITE.url === "https://www.kreatebydesign.com" ||
    Boolean(process.env.NEXT_PUBLIC_SITE_URL),
);
check(
  "absolutePublicUrl uses SITE.url",
  absolutePublicUrl("/work").startsWith(SITE.url),
);
check(
  "absoluteUrl matches absolutePublicUrl host",
  new URL(absoluteUrl("/about")).origin === new URL(absolutePublicUrl("/about")).origin,
);
check(
  "public-routes has no apex-only fallback",
  !readFileSync(join(process.cwd(), "lib/seo/public-routes.ts"), "utf8").includes(
    '"https://kreatebydesign.com"',
  ),
);

// Robots
const robotsSrc = readFileSync(join(process.cwd(), "app/robots.ts"), "utf8");
check("robots names OAI-SearchBot", robotsSrc.includes("OAI-SearchBot"));
check("robots still disallows /admin/", robotsSrc.includes('"/admin/"'));
check("robots still disallows audit results", robotsSrc.includes('"/website-audit/results/"'));
check(
  "robots does not add GPTBot user-agent rule",
  !/userAgent:\s*["']GPTBot["']/.test(robotsSrc),
);

// Entity schema
const org = organizationSchema();
const person = founderPersonSchema();
check("Organization has founder @id", (org.founder as { "@id": string })["@id"].endsWith("#founder"));
check("Organization has knowsAbout", Array.isArray(org.knowsAbout));
check("Person is Matt Lunger", person.name === "Matt Lunger");
check(
  "Person jobTitle matches public About",
  person.jobTitle === "Founder & Creative Director",
);
check("Person worksFor organization", (person.worksFor as { "@id": string })["@id"].endsWith("#organization"));
check("Person has no invented telephone", !("telephone" in person));

// FAQ parity — growth FAQs
const growthFaqs = STATIC_SERVICE_DETAILS["growth-infrastructure"].faqs;
const faqSchema = faqPageSchema(growthFaqs);
check("Growth FAQ schema emitted", Boolean(faqSchema));
check(
  "Growth FAQ includes connected infrastructure question",
  growthFaqs.some((f) =>
    f.question.includes("website, SEO, analytics and conversion"),
  ),
);
const mainEntity = (faqSchema as { mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> }).mainEntity;
check(
  "FAQ schema question count matches visible FAQs",
  mainEntity.length === growthFaqs.length,
);
check(
  "FAQ schema text matches visible answers",
  mainEntity.every(
    (entity, i) =>
      entity.name === growthFaqs[i].question &&
      entity.acceptedAnswer.text === growthFaqs[i].answer,
  ),
);
check("Empty FAQs yield null schema", faqPageSchema([]) === null);

// AI classification
check(
  "chatgpt.com utm → chatgpt",
  classifyAiReferralSource({ utmSource: "chatgpt.com" }) === "chatgpt",
);
check(
  "perplexity host → perplexity",
  classifyAiReferralSource({ referrerHost: "www.perplexity.ai" }) === "perplexity",
);
check(
  "copilot.microsoft.com → copilot",
  classifyAiReferralSource({ referrerHost: "copilot.microsoft.com" }) === "copilot",
);
check(
  "bing.com is not classified as AI",
  classifyAiReferralSource({ referrerHost: "www.bing.com" }) === null,
);
check(
  "google.com is not classified as AI",
  classifyAiReferralSource({ referrerHost: "www.google.com" }) === null,
);

// Events
check("generate_lead event defined", ANALYTICS_EVENTS.generateLead === "generate_lead");
check("inquiry_submit preserved", ANALYTICS_EVENTS.inquirySubmit === "inquiry_submit");

// Forms include AI referral option
const contactSrc = readFileSync(
  join(process.cwd(), "components/contact/ContactForm.tsx"),
  "utf8",
);
const startSrc = readFileSync(
  join(process.cwd(), "components/start-project/StartProjectForm.tsx"),
  "utf8",
);
check("Contact form has AI referral option", contactSrc.includes("chatgpt-ai-assistant"));
check("Start Project has AI referral option", startSrc.includes("chatgpt-ai-assistant"));
check("Contact fires generate_lead after success", contactSrc.includes("generateLead"));
check("Start Project fires generate_lead after success", startSrc.includes("generateLead"));

console.log("\nAll AI visibility foundation checks passed.\n");
