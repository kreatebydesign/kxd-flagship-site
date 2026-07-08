import Link from "next/link";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { KxdPage } from "@/components/os";

export function ReviewWorkspaceGone() {
  return (
    <OperationsShell activeId="review-inbox">
      <KxdPage className="kxd-os-ops-page kxd-os-review-workspace-gone">
        <div className="kxd-os-review-workspace-gone__panel">
          <h1 className="kxd-os-review-workspace-gone__title">Revision not found</h1>
          <p className="kxd-os-review-workspace-gone__lead">
            This revision may have been deleted or is no longer in the Review Inbox.
          </p>
          <Link href="/admin/operations/review-inbox" className="kxd-os-btn kxd-os-btn--secondary">
            Back to Review Inbox
          </Link>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
