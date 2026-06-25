import { EMPTY_LAUNCH_DRAFT, type ClientLaunchDraft } from "./types";

export function validateImportDraft(draft: ClientLaunchDraft): string[] {
  const errors: string[] = [];

  if (!draft.business?.businessName?.trim()) {
    errors.push("business.businessName is required.");
  }

  if (
    draft.executive?.healthScore &&
    Number.isNaN(Number(draft.executive.healthScore))
  ) {
    errors.push("executive.healthScore must be a number.");
  }

  if (
    draft.financial?.monthlyRetainer &&
    Number.isNaN(Number(String(draft.financial.monthlyRetainer).replace(/[^0-9.]/g, "")))
  ) {
    errors.push("financial.monthlyRetainer must be numeric.");
  }

  return errors;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter((s) => s.trim());
  if (typeof value === "string") return value.split("\n").map((s) => s.trim()).filter(Boolean);
  return [];
}

/** Merge pasted JSON into ClientLaunchDraft; supports extended services blocks. */
export function normalizeImportDraft(raw: unknown): ClientLaunchDraft {
  if (!raw || typeof raw !== "object") {
    throw new Error("Import JSON must be an object matching the Client Launch draft shape.");
  }

  const input = raw as Record<string, unknown>;
  const draft: ClientLaunchDraft = JSON.parse(
    JSON.stringify({
      ...EMPTY_LAUNCH_DRAFT,
      ...input,
      business: { ...EMPTY_LAUNCH_DRAFT.business, ...(input.business as object) },
      contacts: {
        ...EMPTY_LAUNCH_DRAFT.contacts,
        ...(input.contacts as object),
      },
      financial: { ...EMPTY_LAUNCH_DRAFT.financial, ...(input.financial as object) },
      services: { ...EMPTY_LAUNCH_DRAFT.services, ...(input.services as object) },
      technical: { ...EMPTY_LAUNCH_DRAFT.technical, ...(input.technical as object) },
      executive: { ...EMPTY_LAUNCH_DRAFT.executive, ...(input.executive as object) },
      roadmap: { ...EMPTY_LAUNCH_DRAFT.roadmap, ...(input.roadmap as object) },
    }),
  );

  const servicesRaw = input.services as Record<string, unknown> | undefined;
  if (servicesRaw && ("current" in servicesRaw || "future" in servicesRaw || "completed" in servicesRaw)) {
    const current = asStringArray(servicesRaw.current);
    const future = asStringArray(servicesRaw.future);
    const completed = asStringArray(servicesRaw.completed);

    draft.services.selected = current;
    draft.services.customServices = completed.join("\n");
    if (future.length > 0 && !draft.executive.growthOpportunities.trim()) {
      draft.executive.growthOpportunities = future.join("\n");
    }
  }

  const roadmapRaw = input.roadmap as Record<string, unknown> | undefined;
  if (roadmapRaw?.northStarMetric && typeof roadmapRaw.northStarMetric === "string") {
    const metric = roadmapRaw.northStarMetric.trim();
    if (metric) {
      draft.executive.strategicNotes = [
        draft.executive.strategicNotes.trim(),
        `North Star Metric: ${metric}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    }
  }

  const contactsRaw = input.contacts as Record<string, unknown> | undefined;
  if (contactsRaw?.notes && typeof contactsRaw.notes === "string") {
    draft.executive.strategicNotes = [
      draft.executive.strategicNotes.trim(),
      contactsRaw.notes.trim(),
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (contactsRaw?.secondaryDecisionMaker && typeof contactsRaw.secondaryDecisionMaker === "string") {
    const name = contactsRaw.secondaryDecisionMaker.trim();
    if (name) {
      draft.contacts.additionalContacts = [
        ...draft.contacts.additionalContacts,
        { name, role: "Secondary decision maker", email: "" },
      ];
    }
  }

  const financialRaw = input.financial as Record<string, unknown> | undefined;
  if (financialRaw?.paymentReliability && typeof financialRaw.paymentReliability === "string") {
    draft.financial.paymentTerms = [
      draft.financial.paymentTerms.trim(),
      `Payment reliability: ${financialRaw.paymentReliability.trim()}`,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (typeof draft.business.status === "string") {
    const s = draft.business.status.toLowerCase();
    draft.business.status = s === "active" ? "active" : "prospect";
  }

  const tierMap: Record<string, ClientLaunchDraft["executive"]["clientTier"]> = {
    a: "A",
    b: "B",
    c: "C",
  };
  if (typeof draft.executive.clientTier === "string") {
    const t = draft.executive.clientTier.trim();
    draft.executive.clientTier = tierMap[t.toLowerCase()] ?? (t as ClientLaunchDraft["executive"]["clientTier"]);
  }

  const potentialMap = (v: string) => v.toLowerCase() as "low" | "medium" | "high" | "flagship";
  if (draft.executive.caseStudyPotential) {
    draft.executive.caseStudyPotential = potentialMap(String(draft.executive.caseStudyPotential));
  }
  if (draft.executive.referralPotential) {
    draft.executive.referralPotential = potentialMap(String(draft.executive.referralPotential)) as "low" | "medium" | "high";
  }
  if (draft.executive.productizationPotential) {
    draft.executive.productizationPotential = potentialMap(String(draft.executive.productizationPotential)) as "low" | "medium" | "high";
  }
  if (draft.executive.internalPriority) {
    const p = String(draft.executive.internalPriority).toLowerCase();
    if (p === "critical" || p === "high" || p === "medium" || p === "low") {
      draft.executive.internalPriority = p;
    }
  }

  return draft;
}
