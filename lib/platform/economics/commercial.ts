import type {
  PlatformCommercialEvidence,
  CommercialValuationView,
  EnterpriseLicensingOutput,
  HypotheticalExitScenario,
  SaasSimulatorOutput,
} from "./types";

const MIN_PRODUCT_CUSTOMERS_FOR_ESTABLISHED = 3;
const MIN_PRODUCT_MRR_FOR_ESTABLISHED = 5_000;

function hypotheticalScenarios(
  saas: SaasSimulatorOutput,
  enterprise: EnterpriseLicensingOutput,
  hypotheticalIpUsd: number,
): HypotheticalExitScenario[] {
  return [
    {
      id: "saas-arr-multiple",
      label: "Illustrative SaaS ARR multiple",
      description:
        "Hypothetical scenario valuation from editable tier counts and ARR multiple. Not live product revenue.",
      valueUsd: saas.hypotheticalArrValuation,
    },
    {
      id: "white-label-program",
      label: "White-label license program (scenario)",
      description: "Setup plus recurring license fees for usage rights. Does not transfer IP ownership.",
      valueUsd: enterprise.whiteLabelScenarioTotal,
    },
    {
      id: "perpetual-enterprise",
      label: "Perpetual enterprise usage licenses (scenario)",
      description: "Deployment usage rights — not ownership of KXD OS intellectual property.",
      valueUsd: enterprise.perpetualLicenseTotal,
    },
    {
      id: "annual-enterprise",
      label: "Annual enterprise license book (scenario)",
      description: "Recurring annual enterprise license fees across modeled deal count.",
      valueUsd: enterprise.annualEnterpriseBookTotal,
    },
    {
      id: "ip-acquisition",
      label: "Full IP acquisition (hypothetical)",
      description:
        "Strategic planning scenario only. Separate from subscription, license, or replacement-cost models.",
      valueUsd: hypotheticalIpUsd,
    },
  ];
}

export function buildCommercialValuationView(
  evidence: PlatformCommercialEvidence,
  model: {
    overallCompletionPercent: number;
    registrySubsystemCount: number;
    saas: SaasSimulatorOutput;
    enterprise: EnterpriseLicensingOutput;
  },
  hypotheticalIpUsd: number,
): CommercialValuationView {
  const { saas, enterprise } = model;
  const productMrr = 0;
  const productCustomers = 0;

  const established =
    productCustomers >= MIN_PRODUCT_CUSTOMERS_FOR_ESTABLISHED &&
    productMrr >= MIN_PRODUCT_MRR_FOR_ESTABLISHED;

  const evidenceSummary: string[] = [
    `KXD OS product subscriptions: ${productCustomers} paying customers, $${productMrr.toLocaleString()} MRR (no separate product billing surface wired to this dashboard).`,
    `Studio agency recurring (client services, not KXD OS SaaS): $${Math.round(evidence.studioPortfolioMrrUsd).toLocaleString()} portfolio MRR across ${evidence.studioPayingClientRows} clients with recurring rows.`,
    `Platform maturity signal: ${model.overallCompletionPercent}% registry completion across ${model.registrySubsystemCount} subsystems.`,
    "Replacement-cost estimates are engineering models and are not used to derive commercial exit value.",
  ];

  const headline = established
    ? "Commercial valuation framework has sufficient product revenue evidence for illustrative modeling."
    : "Commercial valuation not yet established.";

  return {
    established,
    headline,
    evidenceSummary,
    actualProduct: productMrr > 0 || productCustomers > 0
      ? {
          mrrUsd: productMrr,
          payingCustomers: productCustomers,
          source: "KXD OS product billing",
        }
      : null,
    studioAgencyContext: {
      mrrUsd: evidence.studioPortfolioMrrUsd,
      payingClientRows: evidence.studioPayingClientRows,
      activeRetainerServices: evidence.studioActiveRetainerServices,
      disclaimer:
        "Agency client recurring revenue reflects Kreate by Design services. It is not KXD OS subscription revenue.",
    },
    hypotheticalScenarios: hypotheticalScenarios(saas, enterprise, hypotheticalIpUsd),
    replacementCostDistinction:
      "Estimated software replacement cost reflects modeled engineering effort to rebuild the platform. Commercial and exit scenarios use revenue, licensing, and market hypotheses — never development hours.",
  };
}
