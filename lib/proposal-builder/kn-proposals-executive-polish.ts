import type { ProposalDeliverable, ProposalDocument } from "./types.ts";

export const KN_PROPOSAL_IDS = [11, 12] as const;
export const KN_PROPOSAL_NUMBERS = {
  11: "KXD-P-2026-0009",
  12: "KXD-P-2026-0010",
} as const;

const EXCLUSIONS =
  "CMS or production CMS integration, Magento or other platform integration, back-end development, production testing, production deployment, hosting, Find Your Filter, and third-party fees unless explicitly listed in the signed agreement.";

const ENTERPRISE_ASSUMPTIONS =
  "Approximately 38 pages are organized into reusable template families; the definitive template-family inventory and acceptance criteria will be confirmed during discovery and documented in the final agreement. Find Your Filter is excluded.";

const ENTERPRISE_EXCLUSIONS =
  "Production CMS/Magento integration, back-end development, production testing, deployment, hosting, and Find Your Filter.";

const ROADMAP_OVERVIEW =
  "Six phased milestones with responsibilities for Kreate by Design, K&N stakeholders, and K&N IT. Phases 3 and 4 run in parallel so IT can implement approved homepage and priority template families while creative production continues on remaining pages. Dates are targets contingent on timely kickoff, materials, consolidated feedback, and agreed review windows. K&N IT owns production integration, CMS/Magento work, production testing, deployment, and launch; this schedule is not a production go-live date.";

function roadmapPhaseDescription(parts: {
  kxd: string;
  kn: string;
  it: string;
  gate: string;
}): string {
  return [
    `Kreate by Design: ${parts.kxd}`,
    `K&N: ${parts.kn}`,
    `K&N IT: ${parts.it}`,
    `Approval gate: ${parts.gate}`,
  ].join("\n");
}

const ROADMAP_BY_PHASE_TITLE: Record<string, string> = {
  "Roadmap Phase 1": roadmapPhaseDescription({
    kxd:
      "Discovery, template-family architecture for the ~38-page program, and two distinct creative directions.",
    kn: "Stakeholders, content, brand assets, and consolidated feedback through the designated project owner.",
    it: "Optional technical input on handoff and integration constraints.",
    gate: "Both creative directions presented and reviewed.",
  }),
  "Roadmap Phase 2": roadmapPhaseDescription({
    kxd: "Refine the selected direction and prepare the direction approval package.",
    kn: "Select one direction and approve in writing.",
    it: "Review direction pack and template-family plan.",
    gate: "Creative direction approved.",
  }),
  "Roadmap Phase 3": roadmapPhaseDescription({
    kxd:
      "Homepage, priority templates, responsive design system, and first developer handoff package.",
    kn: "Review and approve within agreed feedback windows.",
    it: "Begin implementation from approved homepage and priority templates.",
    gate: "Primary templates approved for IT implementation.",
  }),
  "Roadmap Phase 4": roadmapPhaseDescription({
    kxd:
      "Remaining template-family pages, interaction patterns, technical graphics, and rolling handoff packages.",
    kn: "Rolling content support and batch approvals through the designated owner.",
    it: "Receive and queue approved packages as released.",
    gate: "In-scope template families approved (Find Your Filter excluded).",
  }),
  "Roadmap Phase 5": roadmapPhaseDescription({
    kxd: "Consolidated creative scope review and punch-list preparation.",
    kn: "Executive review and consolidated punch-list feedback.",
    it: "Alignment on integration queue and open technical items.",
    gate: "Creative scope review accepted.",
  }),
  "Roadmap Phase 6": roadmapPhaseDescription({
    kxd: "Agreed final revisions, documentation, and final handoff package.",
    kn: "Consolidated revision feedback within the contractual review window.",
    it: "Receive final source materials and documentation.",
    gate: "Creative handoff acknowledged (not production launch).",
  }),
};

function patchRoadmapDeliverable(item: ProposalDeliverable): ProposalDeliverable {
  const key = Object.keys(ROADMAP_BY_PHASE_TITLE).find((prefix) => item.title.startsWith(prefix));
  if (!key) return item;
  return { ...item, description: ROADMAP_BY_PHASE_TITLE[key] };
}

function patchScopeGroups(doc: ProposalDocument): ProposalDocument {
  return {
    ...doc,
    scopeGroups: doc.scopeGroups.map((group) => {
      if (group.title.includes("Enterprise creative scope")) {
        return {
          ...group,
          assumptions: ENTERPRISE_ASSUMPTIONS,
          exclusions: ENTERPRISE_EXCLUSIONS,
        };
      }
      if (group.title.includes("Delivery roadmap")) {
        return {
          ...group,
          overview: ROADMAP_OVERVIEW,
          deliverables: group.deliverables.map(patchRoadmapDeliverable),
        };
      }
      return group;
    }),
  };
}

function patchSharedTerms(doc: ProposalDocument): ProposalDocument {
  return {
    ...doc,
    terms: {
      ...doc.terms,
      exclusions: EXCLUSIONS,
    },
  };
}

export function patchKnProposalExecutivePolish(
  doc: ProposalDocument,
  proposalId: 11 | 12,
): ProposalDocument {
  let next = patchSharedTerms(patchScopeGroups({ ...doc }));

  if (proposalId === 11) {
    next = {
      ...next,
      terms: {
        ...next.terms,
        nextSteps:
          "Review this proposal alongside companion proposal KXD-P-2026-0010 (interactive design and code-first reference, $49,500). Compare both options with K&N marketing, IT, and finance stakeholders. The $10,000 difference funds a Next.js/React front-end reference, staging review, and rolling source handoffs—useful when IT wants inspectable responsive behavior before production integration, subject to IT approval of the handoff format. Select the preferred approach and accept this proposal (Option A) when ready for Kreate by Design to prepare the formal agreement for signature.",
        intellectualPropertySummary:
          "Upon full payment, K&N receives ownership of paid custom deliverables created specifically for this engagement (designs, documentation, and agreed design-source deliverables identified in the agreement), subject to third-party license terms for embedded fonts, stock, or software. Kreate by Design retains ownership of its pre-existing frameworks, reusable utilities, internal tools, and background intellectual property; K&N receives a license to use those elements only as embedded in the delivered work. Third-party components remain subject to their respective licenses. If K&N's formal SOW or procurement terms require different ownership or work-for-hire language, those terms must be reviewed and agreed in the final contract before signature.",
      },
      executive: {
        ...next.executive,
        executiveSummary:
          "Kreate by Design will lead enterprise UX/UI design for K&N Global Filtration's marketing-led web modernization: approximately 38 pages organized into reusable template families, two creative directions, a responsive design system, technical graphics, and phased developer handoff through December 2026. This engagement gives marketing and IT a single approved creative system and specification package so IT can implement with confidence. It does not include CMS/Magento integration, back-end development, production testing, deployment, hosting, or Find Your Filter.",
        clientFacingIntro:
          "K&N Global Filtration is modernizing its enterprise web presence with disciplined template architecture, strong UX/UI, and clear separation between creative delivery and production integration. This proposal (Option A — KXD-P-2026-0009) delivers editable design-source files and developer specifications in a format agreed with K&N IT. K&N IT integrates, builds, tests, and deploys on your production stack and may begin from approved homepage and priority template handoffs while creative production continues on remaining pages.",
        recommendedDirection:
          "Option A is the design-source path: approved creative direction, template families, and phased specifications without a coded reference build. Editable design-source delivery (Figma is K&N's stated preference) will be confirmed with K&N IT before any final tool commitment.",
        objectives:
          "Establish an approved creative direction, deliver the in-scope template families and design system, and hand off organized specifications and design-source assets so K&N marketing and IT can implement with confidence.",
      },
    };
    next.scopeGroups = next.scopeGroups.map((group) => {
      if (group.title.startsWith("Option A")) {
        return {
          ...group,
          overview:
            "Editable design-source files, responsive layouts, and developer specifications for K&N IT to implement in your production stack.",
        };
      }
      return group;
    });
  }

  if (proposalId === 12) {
    next = {
      ...next,
      terms: {
        ...next.terms,
        nextSteps:
          "Review this proposal alongside companion proposal KXD-P-2026-0009 (enterprise UX/UI design and editable design-source handoff, $39,500). Compare both options with K&N marketing, IT, and finance stakeholders. The additional $10,000 in this option funds a Next.js/React front-end reference, private staging review, organized repository handoffs, and demonstrated responsive interactions—reducing ambiguity during IT handoff when that workflow is approved by K&N IT. Select the preferred approach and accept this proposal (Option B) when ready for Kreate by Design to prepare the formal agreement for signature.",
      },
      executive: {
        ...next.executive,
        executiveSummary:
          "Kreate by Design will deliver the same enterprise creative program (~38 pages in reusable template families, two directions, design system, technical graphics) plus a Next.js/React interactive front-end reference, staging review, and rolling source handoffs through December 2026. The reference helps IT validate layout, responsiveness, and interaction intent before production CMS/Magento work. It is not production platform integration, Magento compatibility, back-end implementation, production testing, deployment, or hosting.",
        clientFacingIntro:
          "K&N Global Filtration is modernizing its enterprise web presence with disciplined template architecture and, in this option, a code-first reference that helps IT see real responsive behavior before production integration. This proposal (Option B — KXD-P-2026-0010) builds on the same creative scope as Option A (KXD-P-2026-0009) with an additional $10,000 investment for reference implementation, staging, and rolling repository handoffs. K&N IT owns CMS integration, production development, testing, deployment, and launch.",
        recommendedDirection:
          "Option B is presented when K&N IT confirms that a Next.js/React reference repository, private staging review, and rolling source handoffs align with your approved integration workflow. K&N has not pre-approved Next.js, React, or a specific repository structure; those choices will be confirmed with IT before kickoff. Production integration remains K&N IT's responsibility.",
        objectives:
          "Deliver an approved creative direction as working templates and components, with staging review and documented source handoffs, so K&N IT can implement against a known front-end reference—without assuming production CMS work by Kreate by Design.",
      },
    };
    next.scopeGroups = next.scopeGroups.map((group) => {
      if (group.title.startsWith("Option B")) {
        return {
          ...group,
          overview:
            "Interactive front-end reference and organized source for K&N IT to implement; not production CMS/Magento integration, production testing, deployment, or hosting.",
          deliverables: group.deliverables.map((item) => {
            if (item.title.includes("staging environment")) {
              return {
                ...item,
                title: item.title.replace(
                  "private staging environment for review",
                  "private staging URL for review",
                ),
              };
            }
            return item;
          }),
        };
      }
      return group;
    });
  }

  return next;
}

export function assertKnPaymentScheduleUnchanged(
  before: ProposalDocument,
  after: ProposalDocument,
  proposalId: 11 | 12,
): void {
  const expectedTotalCents = proposalId === 11 ? 3_950_000 : 4_950_000;
  const sum = after.paymentSchedule.reduce((acc, row) => acc + row.amountCents, 0);
  if (sum !== expectedTotalCents) {
    throw new Error(`Proposal ${proposalId}: payment schedule sum ${sum} !== ${expectedTotalCents}`);
  }
  const beforeCents = before.paymentSchedule.map((p) => p.amountCents).join(",");
  const afterCents = after.paymentSchedule.map((p) => p.amountCents).join(",");
  if (beforeCents !== afterCents) {
    throw new Error(`Proposal ${proposalId}: payment schedule amounts changed`);
  }
  const beforePrices = before.pricingLines.map((l) => l.unitPriceCents).join(",");
  const afterPrices = after.pricingLines.map((l) => l.unitPriceCents).join(",");
  if (beforePrices !== afterPrices) {
    throw new Error(`Proposal ${proposalId}: pricing line amounts changed`);
  }
  if (before.depositCents !== after.depositCents) {
    throw new Error(`Proposal ${proposalId}: depositCents changed`);
  }
}
