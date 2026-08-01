"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";

export function PortalSecurityEnroll() {
  const router = useRouter();
  const [status, setStatus] = useState<{
    totpEnabled: boolean;
    passkeys: Array<{ id: number; label: string | null }>;
    mfaEncryptionConfigured: boolean;
    requiresEnrollment: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/api/portal/security/status");
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.message ?? "Could not load security status.");
    setStatus({
      totpEnabled: data.totpEnabled,
      passkeys: data.passkeys ?? [],
      mfaEncryptionConfigured: data.mfaEncryptionConfigured,
      requiresEnrollment: data.requiresEnrollment,
    });
    if (!data.requiresEnrollment && (data.totpEnabled || (data.passkeys?.length ?? 0) > 0)) {
      // Enrollment complete — allow continue
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/portal/security/status");
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.message ?? "Could not load security status.");
        }
        if (cancelled) return;
        setStatus({
          totpEnabled: data.totpEnabled,
          passkeys: data.passkeys ?? [],
          mfaEncryptionConfigured: data.mfaEncryptionConfigured,
          requiresEnrollment: data.requiresEnrollment,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load security status.");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function registerPasskey() {
    setBusy(true);
    setError("");
    setNotice("");
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
        body: JSON.stringify({ response: attestation, label: "Primary passkey" }),
      });
      const verifyBody = await verifyRes.json();
      if (!verifyRes.ok || !verifyBody.ok) {
        throw new Error(verifyBody.message ?? "Passkey registration failed.");
      }
      setNotice(
        "Passkey saved. On supported devices this may use Face ID, Touch ID, or Windows Hello — biometrics stay on your device.",
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
      setNotice("Authenticator enabled. Store your recovery codes securely — they are shown once.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid authenticator code.");
    } finally {
      setBusy(false);
    }
  }

  const enrolled =
    Boolean(status?.totpEnabled) || Boolean(status && status.passkeys.length > 0);

  return (
    <div className="kxd-portal-auth__form">
      <p className="kxd-portal-auth__notice" role="status">
        Complete security enrollment with a passkey or an authenticator app before entering your
        workspace. KXD never stores Face ID, Touch ID, or Windows Hello biometric data.
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

      <div style={{ display: "grid", gap: 16 }}>
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px" }}>Passkey</h2>
          <p style={{ margin: "0 0 12px", fontSize: 14, opacity: 0.8 }}>
            Prefer a device passkey when available. Your device may prompt for Face ID, Touch ID,
            or Windows Hello.
          </p>
          <button
            type="button"
            className="kxd-portal-auth__submit"
            disabled={busy}
            onClick={() => void registerPasskey()}
          >
            {busy ? "Working…" : "Continue with a passkey"}
          </button>
          {status && status.passkeys.length > 0 ? (
            <p className="kxd-portal-auth__notice" style={{ marginTop: 12 }}>
              {status.passkeys.length} passkey registered.
            </p>
          ) : null}
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px" }}>Authenticator app</h2>
          {!status?.mfaEncryptionConfigured ? (
            <p className="kxd-portal-auth__notice">
              Authenticator setup requires PORTAL_MFA_ENCRYPTION_KEY on the server.
            </p>
          ) : !totpSecret && !status?.totpEnabled ? (
            <button
              type="button"
              className="kxd-portal-auth__submit"
              disabled={busy}
              onClick={() => void beginTotp()}
            >
              Set up authenticator app
            </button>
          ) : null}
          {qrDataUrl && totpSecret ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Authenticator QR code" width={220} height={220} />
              <p style={{ fontSize: 13, wordBreak: "break-all" }}>Manual key: {totpSecret}</p>
              <div className="kxd-portal-auth__field">
                <label className="kxd-portal-auth__label" htmlFor="enroll-totp">
                  6-digit code
                </label>
                <input
                  id="enroll-totp"
                  className="kxd-portal-auth__input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="kxd-portal-auth__submit"
                disabled={busy}
                onClick={() => void confirmTotp()}
              >
                Confirm authenticator
              </button>
            </div>
          ) : null}
          {status?.totpEnabled ? (
            <p className="kxd-portal-auth__notice">Authenticator enabled.</p>
          ) : null}
        </section>

        {recoveryCodes ? (
          <section>
            <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px" }}>Recovery codes</h2>
            <ul style={{ fontFamily: "monospace", fontSize: 13 }}>
              {recoveryCodes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <button
          type="button"
          className="kxd-portal-auth__submit"
          disabled={!enrolled || busy}
          onClick={() => {
            router.push("/portal");
            router.refresh();
          }}
        >
          {enrolled ? "Continue to workspace" : "Enroll a passkey or authenticator to continue"}
        </button>
      </div>
    </div>
  );
}
