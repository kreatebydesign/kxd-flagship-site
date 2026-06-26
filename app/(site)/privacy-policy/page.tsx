import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SITE } from "@/lib/site";
import { buildMetadata } from "@/lib/seo/metadata";

const CONTACT_EMAIL = "matt@kreatebydesign.com";
const LAST_UPDATED = "June 2026";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "How Kreate by Design collects, uses, and protects information submitted through forms, project inquiries, audits, analytics, and client communications.",
  path: "/privacy-policy",
  keywords: [
    "Privacy Policy",
    "Data Protection",
    "Website Privacy",
    "Kreate by Design Privacy",
  ],
});

const SECTIONS = [
  {
    title: "Overview",
    paragraphs: [
      `${SITE.name} ("KXD," "we," "us") respects your privacy. This policy explains what information we may collect when you visit our website, submit a form, request an audit, communicate with us by email, or use tools connected to our services — and how we use that information.`,
      "This page is intended to be clear and practical. It is not legal advice, and we are not a law firm. If you need advice about your specific situation, please consult a qualified professional.",
    ],
  },
  {
    title: "Information We Collect",
    paragraphs: [
      "The information we collect depends on how you interact with us. We may receive:",
    ],
    list: [
      "Contact details you provide — such as name, email address, phone number, company name, and role.",
      "Project and inquiry details — goals, scope notes, budget range, timelines, and messages submitted through contact forms, start-project flows, or audit requests.",
      "Website audit inputs — URLs, business context, and technical details you choose to share for review.",
      "Communications — content of emails, messages, and meeting notes related to inquiries or active engagements.",
      "Usage and technical data — pages viewed, referring URLs, device and browser type, approximate location derived from IP address, and interaction patterns on our site.",
      "Client portal and operational data — when you are an active client, we may process account credentials, project files, approvals, and workflow information within systems we operate or integrate with on your behalf.",
    ],
  },
  {
    title: "How We Use Information",
    paragraphs: [
      "We use information to operate our business, respond to inquiries, deliver services, and improve how we work. Typical uses include:",
    ],
    list: [
      "Responding to contact requests, project inquiries, and audit submissions.",
      "Evaluating fit, preparing proposals, and communicating about potential or active engagements.",
      "Designing, building, hosting, and maintaining websites, brand systems, growth infrastructure, and client platforms.",
      "Providing analytics, SEO foundations, reporting, and operational support where included in scope.",
      "Sending service-related updates, scheduling, and administrative correspondence.",
      "Improving site performance, content, and user experience.",
      "Protecting our systems, preventing abuse, and meeting reasonable legal or contractual obligations.",
    ],
  },
  {
    title: "Analytics and Tracking",
    paragraphs: [
      "We use analytics and search tools — such as Google Analytics and Google Search Console — to understand how visitors find and use our website. These tools may collect usage data through cookies or similar technologies and process it according to their own policies.",
      "We review this information in aggregate to improve content, navigation, performance, and conversion paths. We do not use analytics to make automated decisions that produce legal or similarly significant effects.",
    ],
  },
  {
    title: "Cookies and Similar Technologies",
    paragraphs: [
      "Our website may use cookies, local storage, pixels, and similar technologies for essential functionality, analytics, and performance measurement.",
      "You can control cookies through your browser settings. Disabling certain cookies may affect how parts of the site function. Where required, we will seek consent before placing non-essential cookies.",
    ],
  },
  {
    title: "Third-Party Services",
    paragraphs: [
      "We rely on trusted third-party providers to run our business and deliver work for clients. Depending on context, these may include hosting, infrastructure, forms, CRM, email, analytics, payment processors, client portals, file storage, and project management tools.",
      "These providers process information according to their own terms and privacy policies. We select vendors with care and limit access to what is needed for the service they provide.",
    ],
    list: [
      "Hosting, infrastructure, and content delivery providers.",
      "Form, CRM, email, and communication platforms.",
      "Analytics, search, and performance monitoring tools.",
      "Payment processors for deposits, invoices, and retainers.",
      "Client portals, file storage, project management, and operational systems.",
      "Design, development, and marketing tools used in delivery.",
    ],
  },
  {
    title: "Data Retention",
    paragraphs: [
      "We retain information for as long as needed to respond to inquiries, deliver services, maintain business records, resolve disputes, and meet applicable obligations.",
      "Inquiry and marketing-related data is generally kept for a reasonable period unless you ask us to delete it or we no longer need it. Client and project records may be retained longer where required for contracts, accounting, or continuity of service.",
    ],
  },
  {
    title: "Your Choices",
    paragraphs: [
      "You may request access, correction, or deletion of personal information we hold about you, subject to legal and contractual limits. You may opt out of non-essential marketing emails at any time.",
      "To make a request, contact us at the email below. We may need to verify your identity before responding.",
    ],
  },
  {
    title: "California and U.S. Visitors",
    paragraphs: [
      "If you are a California resident, you may have additional rights under applicable state privacy laws, including rights to know, delete, and correct certain personal information, and to opt out of certain sharing for cross-context behavioral advertising where applicable.",
      "We do not sell personal information as traditionally defined. We do not use sensitive personal information for purposes requiring an opt-out under California law. If our practices change, we will update this policy accordingly.",
    ],
  },
  {
    title: "Security",
    paragraphs: [
      "We use reasonable administrative, technical, and organizational measures to protect information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
      "If you believe your interaction with us is no longer secure, please contact us promptly.",
    ],
  },
  {
    title: "Changes to This Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. The “Last updated” date at the top reflects the most recent revision. Continued use of our website after changes are posted constitutes acceptance of the updated policy.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro="A straightforward overview of how we handle information across inquiries, audits, analytics, client work, and day-to-day communication."
      sections={SECTIONS}
      contactEmail={CONTACT_EMAIL}
      contactNote="Questions about this policy or how we handle your information? Contact us directly."
    />
  );
}
