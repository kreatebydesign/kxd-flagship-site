"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export function PortalResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => {
      router.push("/portal/login");
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [done, router]);

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
        setError(data.message || PORTAL_CLIENT_LANGUAGE.authResetError);
        return;
      }
      setDone(true);
    } catch {
      setError(PORTAL_CLIENT_LANGUAGE.authResetError);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="kxd-portal-auth__state" role="alert">
        <p className="kxd-portal-auth__state-message">{PORTAL_CLIENT_LANGUAGE.authResetInvalidLink}</p>
        <Link href="/portal/forgot-password" className="kxd-portal-auth__state-link">
          {PORTAL_CLIENT_LANGUAGE.authResetInvalidCta} →
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="kxd-portal-auth__state" role="status">
        <p className="kxd-portal-auth__state-title">{PORTAL_CLIENT_LANGUAGE.authResetSuccessTitle}</p>
        <p className="kxd-portal-auth__state-message">
          {PORTAL_CLIENT_LANGUAGE.authResetSuccessMessage}
        </p>
        <Link href="/portal/login" className="kxd-portal-auth__submit kxd-portal-auth__submit--inline">
          {PORTAL_CLIENT_LANGUAGE.authResetSuccessCta}
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
        <label className="kxd-portal-auth__label" htmlFor="portal-reset-password">
          {PORTAL_CLIENT_LANGUAGE.authResetPassword}
        </label>
        <input
          id="portal-reset-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="kxd-portal-auth__input"
        />
      </div>
      <button type="submit" disabled={loading} className="kxd-portal-auth__submit">
        {loading ? PORTAL_CLIENT_LANGUAGE.authResetSubmitting : PORTAL_CLIENT_LANGUAGE.authResetSubmit}
      </button>
    </form>
  );
}
