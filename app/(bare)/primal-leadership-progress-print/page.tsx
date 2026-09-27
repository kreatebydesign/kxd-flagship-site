import type { Metadata } from "next";
import { PrimalLeadershipProgressReport } from "@/components/ces/leadership-report";
import { PRIMAL_LEADERSHIP_PROGRESS_UPDATE } from "@/lib/ces/leadership-report";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: PRIMAL_LEADERSHIP_PROGRESS_UPDATE.printDocumentTitle,
  robots: { index: false, follow: false },
};

/**
 * Print/PDF source for the September 2026 Leadership Performance Update.
 * Renders the same PrimalLeadershipProgressReport component used in the portal,
 * without portal navigation or operator chrome.
 */
export default function PrimalLeadershipProgressPrintPage() {
  return <PrimalLeadershipProgressReport report={PRIMAL_LEADERSHIP_PROGRESS_UPDATE} />;
}
