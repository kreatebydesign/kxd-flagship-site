/**
 * Proposal document defaults, normalization, and template cloning.
 */

import { normalizePhoneForStorage } from "../formatting/phone-us.ts";
import {
  DEFAULT_ACCEPTANCE_DISCLOSURE,
  DEFAULT_CONTRACT_REQUIRED_DISCLOSURE,
  DEFAULT_OPERATIONAL_DRAFT_NOTICE,
  type ProposalContact,
  type ProposalDocument,
  type ProposalTemplateKind,
} from "./types.ts";

function normalizeContact(raw: Partial<ProposalContact> & { id?: string; name?: string }): ProposalContact {
  const phoneRaw = raw.phone;
  const phone =
    typeof phoneRaw === "string"
      ? phoneRaw
      : phoneRaw != null && String(phoneRaw).trim()
        ? String(phoneRaw)
        : undefined;
  return {
    id: String(raw.id ?? newId("contact")),
    name: String(raw.name ?? ""),
    email: raw.email != null ? String(raw.email) : undefined,
    phone: phone?.trim() ? phone : undefined,
    title: raw.title != null ? String(raw.title) : undefined,
    organizationId: raw.organizationId != null ? String(raw.organizationId) : undefined,
    isPrimary: raw.isPrimary,
  };
}

/** Client-facing summary line for cover / PDF / preview contact blocks. */
export function formatProposalContactSummary(
  contact: ProposalContact | null | undefined,
): string {
  if (!contact) return "";
  return [contact.name, contact.title, contact.email, contact.phone]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" · ");
}

export type ProspectIdentitySource = {
  companyName?: unknown;
  contactName?: unknown;
  email?: unknown;
  phone?: unknown;
};

/**
 * Prefill empty proposal identity fields from a sales prospect.
 * Never overwrites non-empty proposal contact/org values (proposal stays independently editable).
 */
export function prefillIdentityFromProspect(
  prev: ProposalDocument,
  lead: ProspectIdentitySource,
): ProposalDocument {
  let next = prev;
  if (next.organizations.length === 0 && lead.companyName) {
    next = {
      ...next,
      organizations: [
        {
          id: newId("org"),
          name: String(lead.companyName),
          brand: "",
        },
      ],
    };
  }

  const leadName = lead.contactName ? String(lead.contactName).trim() : "";
  const leadEmail = lead.email ? String(lead.email).trim() : "";
  const leadPhone = lead.phone ? normalizePhoneForStorage(String(lead.phone)) : "";
  const existing = next.contacts.find((c) => c.isPrimary) ?? next.contacts[0];
  const hasPrimaryName = Boolean(existing?.name?.trim());

  if (!hasPrimaryName) {
    if (!leadName && !leadEmail && !leadPhone) return next;
    const contact: ProposalContact = {
      id: existing?.id ?? newId("contact"),
      name: leadName || existing?.name || "",
      email: leadEmail || existing?.email || "",
      phone: leadPhone || existing?.phone || "",
      title: existing?.title ?? "",
      isPrimary: true,
      organizationId: existing?.organizationId ?? next.organizations[0]?.id,
    };
    return {
      ...next,
      contacts: [
        contact,
        ...next.contacts.filter((c) => c.id !== contact.id && !c.isPrimary),
      ],
    };
  }

  const phoneEmpty = !existing?.phone?.trim();
  const emailEmpty = !existing?.email?.trim();
  if ((!phoneEmpty || !leadPhone) && (!emailEmpty || !leadEmail)) {
    return next;
  }

  const contact: ProposalContact = {
    ...existing!,
    isPrimary: true,
    email: emailEmpty && leadEmail ? leadEmail : existing!.email,
    phone: phoneEmpty && leadPhone ? leadPhone : existing!.phone,
    organizationId: existing!.organizationId ?? next.organizations[0]?.id,
  };
  return {
    ...next,
    contacts: [
      contact,
      ...next.contacts.filter((c) => c.id !== contact.id && !c.isPrimary),
    ],
  };
}

/** Browser- and Node-safe opaque id (not a security token). */
export function newId(prefix = "id"): string {
  const bytes = new Uint8Array(6);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${hex}`;
}

export function emptyProposalDocument(
  partial?: Partial<ProposalDocument>,
): ProposalDocument {
  return {
    schemaVersion: 1,
    organizations: [],
    contacts: [],
    executive: {},
    scopeGroups: [],
    pricingLines: [],
    credits: [],
    paymentSchedule: [],
    options: {
      mode: "recommended-package",
      clientCanSelect: false,
      packages: [],
    },
    terms: {
      acceptanceDisclosure: DEFAULT_ACCEPTANCE_DISCLOSURE,
      contractRequiredDisclosure: DEFAULT_CONTRACT_REQUIRED_DISCLOSURE,
      operationalDraftNotice: DEFAULT_OPERATIONAL_DRAFT_NOTICE,
      nextSteps:
        "Accept this proposal to authorize preparation of the final agreement. Kreate by Design will prepare a contract draft for review before signature, payment, or onboarding.",
      closingNote: "Prepared with care by Kreate by Design.",
    },
    internal: {},
    currency: "USD",
    taxRateBps: 0,
    depositCents: 0,
    scheduleCallUrl: "",
    templateKind: null,
    ...partial,
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeProposalDocument(raw: unknown): ProposalDocument {
  const base = emptyProposalDocument();
  if (!raw || typeof raw !== "object") return base;
  const input = raw as Partial<ProposalDocument>;

  return {
    schemaVersion: 1,
    organizations: asArray<ProposalDocument["organizations"][number]>(input.organizations),
    contacts: asArray<ProposalDocument["contacts"][number]>(input.contacts).map((c) =>
      normalizeContact(c),
    ),
    executive: { ...base.executive, ...(input.executive ?? {}) },
    scopeGroups: asArray<ProposalDocument["scopeGroups"][number]>(input.scopeGroups).map(
      (g, index) => ({
        ...g,
        deliverables: asArray<ProposalDocument["scopeGroups"][number]["deliverables"][number]>(
          g.deliverables,
        ),
        sortOrder: g.sortOrder ?? index + 1,
        inclusion: g.inclusion ?? "included",
      }),
    ),
    pricingLines: asArray<ProposalDocument["pricingLines"][number]>(input.pricingLines).map(
      (line, index) => ({
        ...line,
        quantity: Number(line.quantity ?? 1) || 1,
        unitPriceCents: Math.round(Number(line.unitPriceCents ?? 0) || 0),
        sortOrder: line.sortOrder ?? index + 1,
        inclusion: line.inclusion ?? "included",
        cadence: line.cadence ?? "one-time",
      }),
    ),
    credits: asArray<ProposalDocument["credits"][number]>(input.credits).map((c) => ({
      ...c,
      amountCents: Math.round(Number(c.amountCents ?? 0) || 0),
    })),
    paymentSchedule: asArray<ProposalDocument["paymentSchedule"][number]>(
      input.paymentSchedule,
    ).map((item, index) => ({
      ...item,
      amountCents: Math.round(Number(item.amountCents ?? 0) || 0),
      sortOrder: item.sortOrder ?? index + 1,
    })),
    options: {
      mode: input.options?.mode ?? "recommended-package",
      clientCanSelect: Boolean(input.options?.clientCanSelect),
      recommendedPackageKey: input.options?.recommendedPackageKey,
      packages: asArray<ProposalDocument["options"]["packages"][number]>(input.options?.packages),
    },
    terms: {
      ...base.terms,
      ...(input.terms ?? {}),
      acceptanceDisclosure:
        input.terms?.acceptanceDisclosure?.trim() || DEFAULT_ACCEPTANCE_DISCLOSURE,
      contractRequiredDisclosure:
        input.terms?.contractRequiredDisclosure?.trim() ||
        DEFAULT_CONTRACT_REQUIRED_DISCLOSURE,
      operationalDraftNotice:
        input.terms?.operationalDraftNotice?.trim() || DEFAULT_OPERATIONAL_DRAFT_NOTICE,
    },
    internal: { ...(input.internal ?? {}) },
    currency: input.currency || "USD",
    taxRateBps: Math.round(Number(input.taxRateBps ?? 0) || 0),
    depositCents: Math.round(Number(input.depositCents ?? 0) || 0),
    scheduleCallUrl: input.scheduleCallUrl ?? "",
    templateKind: (input.templateKind as ProposalTemplateKind | null) ?? null,
  };
}

/** Deep-clone document for a new proposal; regenerates entity ids. */
export function cloneDocumentFromTemplate(source: ProposalDocument): ProposalDocument {
  const doc = normalizeProposalDocument(JSON.parse(JSON.stringify(source)));
  const orgMap = new Map<string, string>();
  const scopeMap = new Map<string, string>();
  const lineMap = new Map<string, string>();

  doc.organizations = doc.organizations.map((org) => {
    const id = newId("org");
    orgMap.set(org.id, id);
    return { ...org, id };
  });

  doc.contacts = doc.contacts.map((c) => ({
    ...c,
    id: newId("contact"),
    organizationId: c.organizationId ? orgMap.get(c.organizationId) : undefined,
  }));

  doc.scopeGroups = doc.scopeGroups.map((g) => {
    const id = newId("scope");
    scopeMap.set(g.id, id);
    return {
      ...g,
      id,
      organizationId: g.organizationId ? orgMap.get(g.organizationId) : undefined,
      deliverables: g.deliverables.map((d) => ({ ...d, id: newId("del") })),
    };
  });

  doc.pricingLines = doc.pricingLines.map((line) => {
    const id = newId("line");
    lineMap.set(line.id, id);
    return {
      ...line,
      id,
      scopeGroupId: line.scopeGroupId ? scopeMap.get(line.scopeGroupId) : undefined,
      organizationId: line.organizationId ? orgMap.get(line.organizationId) : undefined,
    };
  });

  doc.credits = doc.credits.map((c) => ({ ...c, id: newId("credit") }));
  doc.paymentSchedule = doc.paymentSchedule.map((p) => ({ ...p, id: newId("pay") }));
  doc.internal = {};
  return doc;
}

export function buildTemplateDocument(kind: ProposalTemplateKind): ProposalDocument {
  const orgId = newId("org");
  const scopeId = newId("scope");
  const base = emptyProposalDocument({
    templateKind: kind,
    organizations: [{ id: orgId, name: "Client organization", brand: "" }],
    contacts: [
      {
        id: newId("contact"),
        name: "Primary contact",
        email: "",
        title: "",
        organizationId: orgId,
        isPrimary: true,
      },
    ],
  });

  const commonScope = {
    id: scopeId,
    organizationId: orgId,
    title: "Primary scope",
    overview: "Editable overview of the engagement.",
    deliverables: [
      {
        id: newId("del"),
        title: "Discovery and planning",
        description: "Goals, requirements, and project framing.",
        sortOrder: 1,
      },
      {
        id: newId("del"),
        title: "Core deliverable",
        description: "Primary work product for this engagement.",
        sortOrder: 2,
      },
    ],
    milestones: "Kickoff → production → review → launch",
    clientResponsibilities: "Timely feedback, content, and approvals.",
    kxdResponsibilities: "Design, development, and project stewardship.",
    assumptions: "Content and feedback arrive within agreed windows.",
    exclusions: "Items not listed in deliverables are out of scope.",
    estimatedTimeline: "To be confirmed",
    sortOrder: 1,
    inclusion: "included" as const,
  };

  switch (kind) {
    case "website-design-development":
      return {
        ...base,
        executive: {
          executiveSummary:
            "A premium website engagement to clarify positioning, improve conversion paths, and deliver a polished public presence.",
          objectives: "Launch a clear, conversion-ready website that reflects the brand.",
          recommendedDirection: "Design and develop a focused marketing website with strong structure and editorial presentation.",
          desiredOutcomes: "A site that communicates clearly and supports inquiry or registration goals.",
        },
        scopeGroups: [{ ...commonScope, title: "Website design & development" }],
        pricingLines: [
          {
            id: newId("line"),
            scopeGroupId: scopeId,
            organizationId: orgId,
            title: "Website design & development",
            cadence: "one-time",
            quantity: 1,
            unitPriceCents: 0,
            inclusion: "included",
            sortOrder: 1,
          },
        ],
        terms: {
          ...base.terms,
          proposalTerms:
            "Operational proposal terms. Final legal terms appear only in the signed agreement.",
        },
      };
    case "monthly-website-management":
      return {
        ...base,
        executive: {
          executiveSummary: "Ongoing website care, updates, and performance stewardship.",
          objectives: "Keep the website current, secure, and aligned with business needs.",
          recommendedDirection: "Monthly website management retainer.",
        },
        scopeGroups: [{ ...commonScope, title: "Monthly website management" }],
        pricingLines: [
          {
            id: newId("line"),
            scopeGroupId: scopeId,
            organizationId: orgId,
            title: "Website management",
            cadence: "monthly",
            quantity: 1,
            unitPriceCents: 0,
            inclusion: "included",
            sortOrder: 1,
          },
        ],
      };
    case "marketing-advertising-management":
      return {
        ...base,
        executive: {
          executiveSummary: "Managed marketing and advertising support with clear reporting cadence.",
          objectives: "Improve demand generation with accountable campaign management.",
          recommendedDirection: "Monthly marketing and advertising management.",
        },
        scopeGroups: [{ ...commonScope, title: "Marketing & advertising management" }],
        pricingLines: [
          {
            id: newId("line"),
            scopeGroupId: scopeId,
            organizationId: orgId,
            title: "Marketing management",
            cadence: "monthly",
            quantity: 1,
            unitPriceCents: 0,
            inclusion: "included",
            sortOrder: 1,
          },
        ],
      };
    case "combined-project-retainer":
      return {
        ...base,
        executive: {
          executiveSummary:
            "A combined project engagement with optional ongoing management after launch.",
          objectives: "Deliver the project and establish a sustainable operating rhythm.",
          recommendedDirection: "Project build plus optional monthly retainer.",
        },
        scopeGroups: [
          { ...commonScope, title: "Project delivery" },
          {
            ...commonScope,
            id: newId("scope"),
            title: "Optional ongoing management",
            inclusion: "optional",
            sortOrder: 2,
            deliverables: [
              {
                id: newId("del"),
                title: "Monthly stewardship",
                description: "Updates, monitoring, and iterative improvements.",
                sortOrder: 1,
              },
            ],
          },
        ],
        pricingLines: [
          {
            id: newId("line"),
            scopeGroupId: scopeId,
            organizationId: orgId,
            title: "Project delivery",
            cadence: "one-time",
            quantity: 1,
            unitPriceCents: 0,
            inclusion: "included",
            sortOrder: 1,
          },
          {
            id: newId("line"),
            organizationId: orgId,
            title: "Monthly management",
            cadence: "monthly",
            quantity: 1,
            unitPriceCents: 0,
            inclusion: "optional",
            isAddon: true,
            sortOrder: 2,
          },
        ],
        options: {
          mode: "base-plus-addons",
          clientCanSelect: true,
          packages: [],
        },
      };
    case "sponsorship-trade-partnership":
      return {
        ...base,
        executive: {
          executiveSummary:
            "A partnership engagement with sponsorship or trade value recognized as a credit against services.",
          objectives: "Align brand partnership value with clear service delivery.",
          recommendedDirection: "Services offset by an agreed sponsorship/trade credit.",
        },
        scopeGroups: [{ ...commonScope, title: "Partnership services" }],
        pricingLines: [
          {
            id: newId("line"),
            scopeGroupId: scopeId,
            organizationId: orgId,
            title: "Partnership services",
            cadence: "one-time",
            quantity: 1,
            unitPriceCents: 0,
            inclusion: "included",
            sortOrder: 1,
          },
        ],
        credits: [
          {
            id: newId("credit"),
            kind: "sponsorship",
            label: "Sponsorship / trade credit",
            amountCents: 0,
            appliesTo: "one-time",
            notes: "Editable credit — set the agreed offset before sharing.",
          },
        ],
      };
    case "custom-professional-services":
    default:
      return {
        ...base,
        executive: {
          executiveSummary: "Custom professional services tailored to the engagement.",
          objectives: "Define and deliver the agreed outcomes.",
          recommendedDirection: "Custom services agreement path.",
        },
        scopeGroups: [{ ...commonScope, title: "Professional services" }],
        pricingLines: [
          {
            id: newId("line"),
            scopeGroupId: scopeId,
            organizationId: orgId,
            title: "Professional services",
            cadence: "one-time",
            quantity: 1,
            unitPriceCents: 0,
            inclusion: "included",
            sortOrder: 1,
          },
        ],
      };
  }
}
