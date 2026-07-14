"use client";

export function ClientHqLogoutButton() {
  async function handleLogout() {
    await fetch("/api/portal/auth/logout", { method: "POST" });
    window.location.href = "/portal/login";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="kxd-ces-logout"
    >
      Sign out
    </button>
  );
}
