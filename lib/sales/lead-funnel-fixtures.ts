/**
 * Deterministic fixtures for Phase 17 lead funnel verification (no database).
 */

import type { AnyDoc } from "./promote-helpers";

export const FIXTURE_OPEN_LEAD: AnyDoc = {
  id: 501,
  status: "new",
  email: "prospect@acme-corp.com",
  website: "https://www.acme-corp.com",
  companyName: "Acme Corp",
};

export const FIXTURE_CONTACT_INQUIRY: AnyDoc = {
  id: 11,
  status: "new",
  email: "prospect@acme-corp.com",
  website: "https://acme-corp.com",
  company: "Acme Corp",
  source: "contact",
  message: "Interested in a new website.",
};

export const FIXTURE_START_PROJECT: AnyDoc = {
  id: 22,
  status: "new",
  email: "prospect@acme-corp.com",
  websiteUrl: "https://acme-corp.com",
  companyName: "Acme Corp",
  inquirySource: "start-project",
  contactName: "Jane Prospect",
};

export const FIXTURE_INTELLIGENCE_PROJECT: AnyDoc = {
  id: 33,
  status: "new",
  email: "prospect@acme-corp.com",
  inquirySource: "kxd-intelligence",
  sourceWebsiteAudit: 9001,
  notes: "[KXD Intelligence context]\nAudit ID: 9001",
};

export const FIXTURE_WEBSITE_AUDIT: AnyDoc = {
  id: 9001,
  status: "new-lead",
  email: "prospect@acme-corp.com",
  website: "https://acme-corp.com",
  company: "Acme Corp",
  promotedSalesLead: 501,
};

export const FIXTURE_PROPOSAL_FOR_LEAD: AnyDoc = {
  id: 700,
  title: "Acme Website Partnership",
  status: "draft",
  lead: 501,
};
