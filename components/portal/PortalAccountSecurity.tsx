"use client";

import { useEffect, useState } from "react";
import {
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";

/**
 * Account Security — available for all portal users (existing users optional MFA).
 */
export function PortalAccountSecurity() {
  const [status, setStatus] = useState<{
    totpEnabled: boolean;
    passkeys: Array<{ id: number; label: string | null; createdAt: string }>;
    mfaEncryptionConfigured: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  async function refresh() {
    const res = await fetch("/api/portal/security/status");
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.message ?? "Could not load security status.");
    setStatus({
      totpEnabled: data.totpEnabled,
      passkeys: data.passkeys ?? [],
      mfaEncryptionConfigured: data.mfaEncryptionConfigured,
    });
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(err instanceof Error ? err.message : "Could not load security status."),
    );
  }, []);

  async function registerPasskey() {
    setBusy(true);
    setError("");
    try {
      const optRes = await fetch("/api/portal/auth/webauthn/register/options", {
        method: "POST",
      });
      const optBody = await optRes.json();
      if (!optRes.ok || !optBody.ok) {
        throw new Error(optBody.message ?? "Could not start passkey setup.");
      }
      const attestation = await startRegistration({
        optionsJSON: optBody.options as PublicKeyCredentialCreationOptionsJSON,
      });
      const verifyRes = await fetch("/api/portal/auth/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: attestation, label: "Passkey" }),
      });
      const verifyBody = await verifyRes.json();
      if (!verifyRes.ok || !verifyBody.ok) {
        throw new Error(verifyBody.message ?? "Passkey registration failed.");
      }
      setNotice(
        "Passkey saved. Device biometrics (Face ID / Touch ID / Windows Hello) stay on your device — KXD stores only the passkey credential.",
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey registration failed.");
    } finally {
      setBusy(false);
    }
  }

  async function beginTotp() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/portal/auth/totp/begin", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Could not start authenticator setup.");
      setTotpSecret(data.secret);
      setQrDataUrl(data.qrDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start authenticator setup.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmTotp() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/portal/auth/totp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: totpCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Invalid authenticator code.");
      setRecoveryCodes(data.recoveryCodes ?? []);
      setTotpSecret(null);
      setQrDataUrl(null);
      setNotice("Authenticator enabled. Save recovery codes now — they are shown once.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid authenticator code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kxd-portal-auth__form" style={{ maxWidth: 560 }}>
      <p className="kxd-portal-auth__notice">
        Manage passkeys and authenticator apps for this workspace login. Existing accounts are not
        forced to enroll. KXD never stores biometric data.
      </p>
      {error ? (
        <p className="kxd-portal-auth__notice kxd-portal-auth__notice--error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="kxd-portal-auth__notice" role="status">
          {notice}
        </p>
      ) : null}

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500 }}>Passkeys</h2>
        <ul>
          {(status?.passkeys ?? []).map((p) => (
            <li key={p.id}>
              {p.label ?? "Passkey"} · added {new Date(p.createdAt).toLocaleDateString()}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="kxd-portal-auth__submit"
          disabled={busy}
          onClick={() => void registerPasskey()}
        >
          Add a passkey
        </button>
      </section>

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 500 }}>Authenticator app (TOTP)</h2>
        {status?.totpEnabled ? (
          <p className="kxd-portal-auth__notice">Enabled</p>
        ) : !status?.mfaEncryptionConfigured ? (
          <p className="kxd-portal-auth__notice">
            Unavailable until PORTAL_MFA_ENCRYPTION_KEY is configured.
          </p>
        ) : !totpSecret ? (
          <button
            type="button"
            className="kxd-portal-auth__submit"
            disabled={busy}
            onClick={() => void beginTotp()}
          >
            Set up authenticator
          </button>
        ) : (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl ?? ""} alt="Authenticator QR code" width={220} height={220} />
            <p style={{ fontSize: 13, wordBreak: "break-all" }}>Manual key: {totpSecret}</p>
            <input
              className="kxd-portal-auth__input"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="6-digit code"
            />
            <button
              type="button"
              className="kxd-portal-auth__submit"
              disabled={busy}
              onClick={() => void confirmTotp()}
            >
              Confirm
            </button>
          </div>
        )}
      </section>

      {recoveryCodes ? (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 500 }}>Recovery codes</h2>
          <ul style={{ fontFamily: "monospace", fontSize: 13 }}>
            {recoveryCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
