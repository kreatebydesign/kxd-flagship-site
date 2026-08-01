"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function PortalActivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    emailMasked: string;
    displayName: string | null;
    companyNames: string[];
  } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setError("This invitation link is invalid or no longer available.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/portal/activate/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          emailMasked?: string;
          displayName?: string | null;
          companyNames?: string[];
        };
        if (!res.ok || !data.ok) {
          throw new Error(
            data.message ?? "This invitation link is invalid or no longer available.",
          );
        }
        if (cancelled) return;
        setPreview({
          emailMasked: data.emailMasked ?? "",
          displayName: data.displayName ?? null,
          companyNames: data.companyNames ?? [],
        });
        setDisplayName(data.displayName ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "This invitation link is invalid or no longer available.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!termsAccepted) {
      setError("Please accept the workspace terms to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/portal/activate/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          displayName,
          termsAccepted: true,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        redirectTo?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(
          data.message ?? "This invitation link is invalid or no longer available.",
        );
      }
      router.push(data.redirectTo ?? "/portal/security/enroll");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "This invitation link is invalid or no longer available.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="kxd-portal-auth__notice">Checking invitation…</p>;
  }

  if (!preview) {
    return (
      <p className="kxd-portal-auth__notice kxd-portal-auth__notice--error" role="alert">
        {error || "This invitation link is invalid or no longer available."}
      </p>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="kxd-portal-auth__form">
      {error ? (
        <p className="kxd-portal-auth__notice kxd-portal-auth__notice--error" role="alert">
          {error}
        </p>
      ) : null}
      <p className="kxd-portal-auth__notice" role="status">
        Invited as {preview.emailMasked}
        {preview.companyNames.length > 0
          ? ` · ${preview.companyNames.join(", ")}`
          : ""}
      </p>
      <div className="kxd-portal-auth__field">
        <label className="kxd-portal-auth__label" htmlFor="activate-name">
          Display name
        </label>
        <input
          id="activate-name"
          className="kxd-portal-auth__input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </div>
      <div className="kxd-portal-auth__field">
        <label className="kxd-portal-auth__label" htmlFor="activate-password">
          Password
        </label>
        <input
          id="activate-password"
          type="password"
          className="kxd-portal-auth__input"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="kxd-portal-auth__field">
        <label className="kxd-portal-auth__label" htmlFor="activate-confirm">
          Confirm password
        </label>
        <input
          id="activate-confirm"
          type="password"
          className="kxd-portal-auth__input"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <label className="kxd-portal-auth__field" style={{ display: "flex", gap: 8 }}>
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
        />
        <span>I accept the private workspace terms for this invitation.</span>
      </label>
      <button type="submit" className="kxd-portal-auth__submit" disabled={submitting}>
        {submitting ? "Activating…" : "Activate workspace"}
      </button>
    </form>
  );
}
