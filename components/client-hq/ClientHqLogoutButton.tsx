"use client";

export function ClientHqLogoutButton({
  isOperatorPreview = false,
}: {
  isOperatorPreview?: boolean;
}) {
  async function handleLogout() {
    if (isOperatorPreview) {
      const res = await fetch("/api/portal/preview/exit", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        redirectTo?: string;
      };
      window.location.href =
        data.redirectTo || "/admin/operations/client-command";
      return;
    }

    await fetch("/api/portal/auth/logout", { method: "POST" });
    window.location.href = "/portal/login";
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className="kxd-ces-logout"
    >
      {isOperatorPreview ? "Exit Preview" : "Sign out"}
    </button>
  );
}
