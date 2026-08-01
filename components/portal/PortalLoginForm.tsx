"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [mfaStep, setMfaStep] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function redirectAfterLogin() {
    const redirect = searchParams.get("redirect") || "/portal";
    router.push(redirect);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mfaStep) {
        const res = await fetch("/api/portal/auth/totp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            useRecovery
              ? { recoveryCode }
              : { token: mfaCode },
          ),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || PORTAL_CLIENT_LANGUAGE.authLoginErrorGeneric);
          return;
        }
        redirectAfterLogin();
        return;
      }

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
      if (data.mfaRequired) {
        setMfaStep(true);
        return;
      }
      redirectAfterLogin();
    } catch {
      setError(PORTAL_CLIENT_LANGUAGE.authLoginErrorGeneric);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskey() {
    setError("");
    setLoading(true);
    try {
      const optRes = await fetch("/api/portal/auth/webauthn/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const optBody = await optRes.json();
      if (!optRes.ok || !optBody.ok) {
        setError(optBody.message || PORTAL_CLIENT_LANGUAGE.authLoginErrorGeneric);
        return;
      }
      const assertion = await startAuthentication({
        optionsJSON: optBody.options as PublicKeyCredentialRequestOptionsJSON,
      });
      const verifyRes = await fetch("/api/portal/auth/webauthn/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: assertion }),
      });
      const verifyBody = await verifyRes.json();
      if (!verifyRes.ok || !verifyBody.ok) {
        setError(verifyBody.message || PORTAL_CLIENT_LANGUAGE.authLoginErrorGeneric);
        return;
      }
      redirectAfterLogin();
    } catch {
      setError(PORTAL_CLIENT_LANGUAGE.authLoginErrorGeneric);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="kxd-portal-auth__form">
      {error ? (
        <p className="kxd-portal-auth__notice kxd-portal-auth__notice--error" role="alert">
          {error}
        </p>
      ) : null}

      {!mfaStep ? (
        <>
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
            {loading
              ? PORTAL_CLIENT_LANGUAGE.authLoginSubmitting
              : PORTAL_CLIENT_LANGUAGE.authLoginSubmit}
          </button>
          <button
            type="button"
            disabled={loading || !email}
            className="kxd-portal-auth__submit"
            style={{ marginTop: 8, background: "transparent", color: "inherit", border: "1px solid currentColor" }}
            onClick={() => void handlePasskey()}
          >
            Continue with a passkey
          </button>
          <p className="kxd-portal-auth__footer-link" style={{ fontSize: 13, opacity: 0.75 }}>
            On supported devices, passkeys may use Face ID, Touch ID, or Windows Hello. Biometrics
            stay on your device — KXD never stores them.
          </p>
          <p className="kxd-portal-auth__footer-link">
            <Link href="/portal/forgot-password">{PORTAL_CLIENT_LANGUAGE.authLoginForgot}</Link>
          </p>
        </>
      ) : (
        <>
          <p className="kxd-portal-auth__notice" role="status">
            Enter the code from your authenticator app to finish signing in.
          </p>
          {!useRecovery ? (
            <div className="kxd-portal-auth__field">
              <label className="kxd-portal-auth__label" htmlFor="portal-login-mfa">
                Authenticator code
              </label>
              <input
                id="portal-login-mfa"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="kxd-portal-auth__input"
              />
            </div>
          ) : (
            <div className="kxd-portal-auth__field">
              <label className="kxd-portal-auth__label" htmlFor="portal-login-recovery">
                Recovery code
              </label>
              <input
                id="portal-login-recovery"
                required
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                className="kxd-portal-auth__input"
              />
            </div>
          )}
          <button type="submit" disabled={loading} className="kxd-portal-auth__submit">
            {loading ? "Verifying…" : "Verify and continue"}
          </button>
          <button
            type="button"
            className="kxd-portal-auth__footer-link"
            style={{ background: "none", border: 0, cursor: "pointer" }}
            onClick={() => setUseRecovery((v) => !v)}
          >
            {useRecovery ? "Use authenticator code" : "Use a recovery code"}
          </button>
        </>
      )}
    </form>
  );
}
