"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Matches server public copy — keep client bundle free of invitation crypto. */
const INVITE_UNAVAILABLE =
  "This invitation link is invalid or no longer available.";

export function PartnerActivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    emailMasked: string;
    displayName: string | null;
  } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setError(INVITE_UNAVAILABLE);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/portal/partner/activate/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          emailMasked?: string;
          displayName?: string | null;
        };
        if (!res.ok || !data.ok) {
          throw new Error(data.message ?? INVITE_UNAVAILABLE);
        }
        if (cancelled) return;
        setPreview({
          emailMasked: data.emailMasked ?? "",
          displayName: data.displayName ?? null,
        });
        setDisplayName(data.displayName ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : INVITE_UNAVAILABLE);
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
    setSubmitting(true);
    try {
      const res = await fetch("/api/portal/partner/activate/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          displayName: displayName.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        redirectTo?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? INVITE_UNAVAILABLE);
      }
      router.replace(data.redirectTo || "/portal/partner");
    } catch (err) {
      setError(err instanceof Error ? err.message : INVITE_UNAVAILABLE);
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="kxd-portal-auth__lead">Checking your invitation…</p>;
  }

  if (error && !preview) {
    const originBlocked = /invalid request origin/i.test(error);
    return (
      <div className="kxd-portal-auth__state" role="alert">
        <h1 className="kxd-portal-auth__title">
          {originBlocked
            ? "Open this invitation in your browser."
            : "This invitation is no longer available."}
        </h1>
        <p className="kxd-portal-auth__lead">
          {originBlocked
            ? "Open the activation link directly in Safari, Chrome, or another full browser window, then create your password. In-app email browsers can block activation."
            : "It may have expired, been used, or been withdrawn. Contact your KXD point of contact for a new invitation."}
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="kxd-portal-auth__title">Create your password</h1>
      {preview?.displayName ? (
        <p className="kxd-portal-auth__lead">
          Private access for {preview.displayName}
          {preview.emailMasked ? ` · ${preview.emailMasked}` : ""}
        </p>
      ) : preview?.emailMasked ? (
        <p className="kxd-portal-auth__lead">
          Private access for {preview.emailMasked}
        </p>
      ) : (
        <p className="kxd-portal-auth__lead">
          Set a password to activate your KXD Network partner room.
        </p>
      )}
      <form
        className="kxd-portal-auth__form"
        onSubmit={handleSubmit}
        aria-label="Create your password"
      >
        {error ? (
          <p
            className="kxd-portal-auth__notice kxd-portal-auth__notice--error"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="kxd-portal-auth__field">
          <label className="kxd-portal-auth__label" htmlFor="partner-activate-name">
            Display name
          </label>
          <input
            id="partner-activate-name"
            className="kxd-portal-auth__input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>
        <div className="kxd-portal-auth__field">
          <label
            className="kxd-portal-auth__label"
            htmlFor="partner-activate-password"
          >
            Password
          </label>
          <input
            id="partner-activate-password"
            type="password"
            className="kxd-portal-auth__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
          <p className="kxd-portal-auth__hint">At least 8 characters.</p>
        </div>
        <div className="kxd-portal-auth__field">
          <label
            className="kxd-portal-auth__label"
            htmlFor="partner-activate-confirm"
          >
            Confirm password
          </label>
          <input
            id="partner-activate-confirm"
            type="password"
            className="kxd-portal-auth__input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        <button
          type="submit"
          className="kxd-portal-auth__submit"
          disabled={submitting}
        >
          {submitting ? "Activating…" : "Activate private access"}
        </button>
        <p className="kxd-portal-auth__trust">
          This invitation is personal and can be used once.
        </p>
      </form>
    </>
  );
}
