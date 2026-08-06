import Link from "next/link";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import {
  COMMERCIAL_SECTIONS,
  type CommercialSectionId,
} from "@/lib/client-command/commercial/types";
import {
  COMMERCIAL_SECTION_LABELS,
  commercialWorkspaceHref,
} from "@/lib/client-command/commercial/sections";
import { CommercialOverview } from "./CommercialOverview";
import { CommercialProposals } from "./CommercialProposals";
import { CommercialAgreements } from "./CommercialAgreements";
import { CommercialInvoices } from "./CommercialInvoices";
import { CommercialPayments } from "./CommercialPayments";
import { CommercialReceipts } from "./CommercialReceipts";
import { CommercialAuthorizations } from "./CommercialAuthorizations";
import { CommercialDocuments } from "./CommercialDocuments";
import { CommercialTimeline } from "./CommercialTimeline";

export function CommercialWorkspace({
  data,
  section,
}: {
  data: ClientWorkspaceBundle;
  section: CommercialSectionId;
}) {
  return (
    <div className="kxd-os-commercial">
      <header className="kxd-os-commercial__hero">
        <div>
          <p className="kxd-os-eyebrow">Commercial</p>
          <h2 className="kxd-os-commercial__title">Commercial workspace</h2>
          <p className="kxd-os-commercial__lead">
            Proposals, agreements, invoices, payments, authorizations, and commercial history —
            organized around this client.
          </p>
        </div>
        <Link
          href={`/admin/operations/client-command/${data.clientId}/direct-agreement/new`}
          className="kxd-os-btn"
        >
          Create Direct Agreement
        </Link>
      </header>

      <nav className="kxd-os-commercial__sections" aria-label="Commercial sections">
        {COMMERCIAL_SECTIONS.map((id) => (
          <Link
            key={id}
            href={commercialWorkspaceHref(data.clientId, id)}
            className={`kxd-os-commercial__section-link${
              section === id ? " kxd-os-commercial__section-link--active" : ""
            }`}
          >
            {COMMERCIAL_SECTION_LABELS[id]}
          </Link>
        ))}
      </nav>

      <div className="kxd-os-commercial__body">{renderSection(section, data)}</div>
    </div>
  );
}

function renderSection(section: CommercialSectionId, data: ClientWorkspaceBundle) {
  switch (section) {
    case "overview":
      return <CommercialOverview data={data} />;
    case "proposals":
      return <CommercialProposals data={data} />;
    case "agreements":
      return <CommercialAgreements data={data} />;
    case "invoices":
      return <CommercialInvoices data={data} />;
    case "payments":
      return <CommercialPayments data={data} />;
    case "receipts":
      return <CommercialReceipts data={data} />;
    case "authorizations":
      return <CommercialAuthorizations data={data} />;
    case "documents":
      return <CommercialDocuments data={data} />;
    case "timeline":
      return <CommercialTimeline data={data} />;
    default:
      return <CommercialOverview data={data} />;
  }
}
