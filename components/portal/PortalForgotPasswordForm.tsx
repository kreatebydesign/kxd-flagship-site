"use client";

import { useState } from "react";
import Link from "next/link";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export function PortalForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/portal/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setError(PORTAL_CLIENT_LANGUAGE.authForgotError);
        return;
      }
      setSent(true);
    } catch {
      setError(PORTAL_CLIENT_LANGUAGE.authForgotError);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="kxd-portal-auth__state" role="status">
        <p className="kxd-portal-auth__state-title">{PORTAL_CLIENT_LANGUAGE.authForgotSuccessTitle}</p>
        <p className="kxd-portal-auth__state-message">
          {PORTAL_CLIENT_LANGUAGE.authForgotSuccessMessage}
        </p>
        <Link href="/portal/login" className="kxd-portal-auth__state-link">
          {PORTAL_CLIENT_LANGUAGE.authForgotBack} →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="kxd-portal-auth__form">
      {error ? (
        <p className="kxd-portal-auth__notice kxd-portal-auth__notice--error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="kxd-portal-auth__field">
        <label className="kxd-portal-auth__label" htmlFor="portal-forgot-email">
          {PORTAL_CLIENT_LANGUAGE.authLoginEmail}
        </label>
        <input
          id="portal-forgot-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="kxd-portal-auth__input"
        />
      </div>
      <button type="submit" disabled={loading} className="kxd-portal-auth__submit">
        {loading ? PORTAL_CLIENT_LANGUAGE.authForgotSubmitting : PORTAL_CLIENT_LANGUAGE.authForgotSubmit}
      </button>
      <p className="kxd-portal-auth__footer-link">
        <Link href="/portal/login">{PORTAL_CLIENT_LANGUAGE.authForgotBack}</Link>
      </p>
    </form>
  );
}
