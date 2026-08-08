"use client";

export function OperatorPortalPreviewBanner({
  clientName,
}: {
  clientName: string;
}) {
  async function exitPreview() {
    const res = await fetch("/api/portal/preview/exit", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      redirectTo?: string;
    };
    window.location.href = data.redirectTo || "/admin/operations/client-command";
  }

  return (
    <div className="kxd-operator-portal-preview" role="status">
      <div className="kxd-operator-portal-preview__copy">
        <p className="kxd-operator-portal-preview__eyebrow">KXD OS</p>
        <p className="kxd-operator-portal-preview__title">
          Operator Preview · {clientName}
        </p>
        <p className="kxd-operator-portal-preview__note">
          Read-only studio preview. Not a client login.
        </p>
      </div>
      <button
        type="button"
        className="kxd-operator-portal-preview__exit"
        onClick={() => void exitPreview()}
      >
        Exit Preview
      </button>
    </div>
  );
}
