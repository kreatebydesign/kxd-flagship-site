"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function PortalResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/portal/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Reset failed.");
        return;
      }
      setDone(true);
    } catch {
      setError("Unable to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="font-sans" style={{ fontSize: "0.875rem", color: "rgba(210,90,90,0.9)" }}>
        Invalid reset link.{" "}
        <Link href="/portal/forgot-password" style={{ color: "var(--kxd-gold)" }}>
          Request a new one.
        </Link>
      </p>
    );
  }

  if (done) {
    return (
      <div>
        <p className="font-sans font-light" style={{ fontSize: "0.875rem", color: "var(--kxd-cream-muted)" }}>
          Your password has been updated.
        </p>
        <Link
          href="/portal/login"
          className="mt-6 inline-block font-sans uppercase"
          style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", color: "var(--kxd-gold)" }}
        >
          Sign in →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p
          className="font-sans"
          style={{
            fontSize: "0.75rem",
            color: "rgba(210,90,90,0.9)",
            background: "rgba(210,90,90,0.08)",
            border: "1px solid rgba(210,90,90,0.25)",
            padding: "0.75rem 1rem",
          }}
        >
          {error}
        </p>
      )}
      <div>
        <label
          className="mb-2 block font-sans uppercase"
          style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)" }}
        >
          New Password
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full font-sans"
          style={{
            background: "var(--kxd-black-elevated)",
            border: "1px solid var(--kxd-border-white)",
            color: "var(--kxd-cream)",
            padding: "0.75rem 1rem",
            fontSize: "0.875rem",
          }}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="kxd-btn-primary w-full font-sans uppercase disabled:opacity-50"
        style={{ fontSize: "0.625rem", letterSpacing: "0.14em" }}
      >
        {loading ? "Updating…" : "Update Password"}
      </button>
    </form>
  );
}
