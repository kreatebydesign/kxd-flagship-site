import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SITE } from "@/lib/site";
import { buildMetadata } from "@/lib/seo/metadata";

const CONTACT_EMAIL = "matt@kreatebydesign.com";
const LAST_UPDATED = "June 2026";

export const metadata: Metadata = buildMetadata({
  title: "Terms & Conditions",
  description:
    "Terms for using the Kreate by Design website and understanding how inquiries, services, payments, retainers, and project engagements are handled.",
  path: "/terms-and-conditions",
  keywords: [
    "Terms and Conditions",
    "Website Terms",
    "Service Terms",
    "Kreate by Design Terms",
  ],
});

const SECTIONS = [
  {
    title: "Overview",
    paragraphs: [
      `These Terms & Conditions ("Terms") govern your use of the ${SITE.name} website and provide general information about how we handle inquiries and engagements. By accessing this site, you agree to these Terms.`,
      "This page is not legal advice. Specific projects are governed by separate written agreements, proposals, invoices, and scope documents once accepted.",
    ],
  },
  {
    title: "Use of This Website",
    paragraphs: [
      "You may use this website for lawful purposes and in a way that does not infringe the rights of others or restrict their use of the site.",
      "You agree not to attempt unauthorized access to our systems, scrape or harvest data in violation of applicable law, introduce malware, or use the site to transmit unlawful, misleading, or harmful content.",
      "We may restrict or suspend access if we believe the site is being misused.",
    ],
  },
  {
    title: "Intellectual Property",
    paragraphs: [
      "Unless otherwise noted, the content on this website — including text, visuals, layout, code snippets displayed for demonstration, and brand assets — is owned by KXD or used with permission.",
      "You may view and share links to our pages for personal or informational purposes. You may not copy, reproduce, distribute, or create derivative works from site content without our prior written consent.",
    ],
  },
  {
    title: "Project Inquiries",
    paragraphs: [
      "Submitting a contact form, start-project request, audit submission, or email inquiry does not create a client relationship or guarantee availability, pricing, or engagement.",
      "We review inquiries thoughtfully and respond when there is a potential fit. Declining or not responding to an inquiry does not constitute discrimination or breach of any obligation.",
    ],
  },
  {
    title: "Services and Engagements",
    paragraphs: [
      "Descriptions of services on this website — including website design and development, branding and identity, SEO and analytics infrastructure, client portals, audits, retainers, and consulting — are informational.",
      "No binding obligation exists until a written proposal, statement of work, invoice, or contract is accepted by both parties. Scope, deliverables, timelines, and fees are defined in those documents, not solely by website copy or verbal discussions.",
    ],
  },
  {
    title: "Payments, Deposits, and Retainers",
    paragraphs: [
      "Payment terms vary by engagement. Common structures include project deposits, milestone payments, fixed-fee packages, and monthly retainers.",
      "Unless otherwise agreed in writing, invoices are due on the stated due date. Late payments may pause work, delay launches, or incur fees as specified in the applicable agreement.",
      "Deposits are generally non-refundable once work has commenced, except where a signed agreement explicitly provides otherwise.",
      "Retainers reserve capacity and typically renew monthly until cancelled according to the agreed notice period.",
    ],
  },
  {
    title: "Timelines, Revisions, and Client Responsibilities",
    paragraphs: [
      "Timelines depend on scope, feedback speed, third-party dependencies, and client availability. Estimated dates are targets, not guarantees, unless a fixed deadline is explicitly agreed in writing.",
      "Revisions are handled according to the agreed scope. Additional rounds or scope changes may require a change order or additional fees.",
      "Clients are responsible for providing accurate information, timely feedback, required assets, domain and hosting access when applicable, and approvals needed to proceed. Delays in client input may shift delivery dates.",
    ],
  },
  {
    title: "Third-Party Tools and Platforms",
    paragraphs: [
      "Our work often integrates with third-party platforms — hosting providers, CMS tools, analytics services, payment processors, CRMs, email systems, and client portals.",
      "Those services are subject to their own terms, fees, and availability. KXD is not responsible for outages, policy changes, or limitations imposed by third-party vendors outside our reasonable control.",
    ],
  },
  {
    title: "Portfolio and Client Work",
    paragraphs: [
      "Unless restricted by a signed agreement, we may display completed work in our portfolio, case studies, social channels, and marketing materials. We aim to represent client work accurately and respectfully.",
      "If you are a client and prefer limited public use of your project, please discuss confidentiality or usage restrictions before or during the engagement so they can be reflected in writing.",
    ],
  },
  {
    title: "Limitation of Liability",
    paragraphs: [
      "To the fullest extent permitted by law, KXD and its founder, contractors, and affiliates will not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of this website or any preliminary inquiry.",
      "For active engagements, liability limits and remedies are defined in the governing contract. Where no such contract exists, our total liability related to website use shall not exceed the amount you paid to KXD in the twelve months preceding the claim, or one hundred U.S. dollars if no payment was made.",
    ],
  },
  {
    title: "No Warranties",
    paragraphs: [
      "This website and its content are provided \"as is\" and \"as available\" without warranties of any kind, whether express or implied, including implied warranties of merchantability, fitness for a particular purpose, or non-infringement.",
      "We do not warrant that the site will be uninterrupted, error-free, or free of harmful components. Service outcomes for client projects are addressed in individual agreements, not by general website content.",
    ],
  },
  {
    title: "Updates to These Terms",
    paragraphs: [
      "We may revise these Terms from time to time. The “Last updated” date indicates the latest version. Continued use of the website after changes are posted constitutes acceptance of the revised Terms.",
    ],
  },
];

export default function TermsAndConditionsPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Terms & Conditions"
      lastUpdated={LAST_UPDATED}
      intro="General terms for using our website and understanding how inquiries, services, and engagements are structured before a signed agreement is in place."
      sections={SECTIONS}
      contactEmail={CONTACT_EMAIL}
      contactNote="Questions about these Terms? We're happy to clarify before you engage."
    />
  );
}
