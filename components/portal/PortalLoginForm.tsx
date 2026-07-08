"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || PORTAL_CLIENT_LANGUAGE.authLoginErrorGeneric);
        return;
      }
      const redirect = searchParams.get("redirect") || "/portal";
      router.push(redirect);
      router.refresh();
    } catch {
      setError(PORTAL_CLIENT_LANGUAGE.authLoginErrorGeneric);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="kxd-portal-auth__form">
      {error ? (
        <p className="kxd-portal-auth__notice kxd-portal-auth__notice--error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="kxd-portal-auth__field">
        <label className="kxd-portal-auth__label" htmlFor="portal-login-email">
          {PORTAL_CLIENT_LANGUAGE.authLoginEmail}
        </label>
        <input
          id="portal-login-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="kxd-portal-auth__input"
        />
      </div>
      <div className="kxd-portal-auth__field">
        <label className="kxd-portal-auth__label" htmlFor="portal-login-password">
          {PORTAL_CLIENT_LANGUAGE.authLoginPassword}
        </label>
        <input
          id="portal-login-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="kxd-portal-auth__input"
        />
      </div>
      <button type="submit" disabled={loading} className="kxd-portal-auth__submit">
        {loading ? PORTAL_CLIENT_LANGUAGE.authLoginSubmitting : PORTAL_CLIENT_LANGUAGE.authLoginSubmit}
      </button>
      <p className="kxd-portal-auth__footer-link">
        <Link href="/portal/forgot-password">{PORTAL_CLIENT_LANGUAGE.authLoginForgot}</Link>
      </p>
    </form>
  );
}
