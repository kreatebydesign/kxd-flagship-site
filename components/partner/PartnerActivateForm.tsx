"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
        setError("This invitation link is invalid or no longer available.");
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
          throw new Error(
            data.message ?? "This invitation link is invalid or no longer available.",
          );
        }
        if (cancelled) return;
        setPreview({
          emailMasked: data.emailMasked ?? "",
          displayName: data.displayName ?? null,
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
        throw new Error(
          data.message ?? "This invitation link is invalid or no longer available.",
        );
      }
      router.replace(data.redirectTo || "/portal/partner");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "This invitation link is invalid or no longer available.",
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="kxd-portal-auth__lead">Checking your invitation…</p>;
  }

  if (error && !preview) {
    return (
      <p className="kxd-portal-auth__notice kxd-portal-auth__notice--error" role="alert">
        {error}
      </p>
    );
  }

  return (
    <form className="kxd-portal-auth__form" onSubmit={handleSubmit}>
      {preview ? (
        <p className="kxd-portal-auth__lead" style={{ marginBottom: "1.25rem" }}>
          Access for {preview.emailMasked}
          {preview.displayName ? ` · ${preview.displayName}` : ""}
        </p>
      ) : null}
      {error ? (
        <p className="kxd-portal-auth__notice kxd-portal-auth__notice--error" role="alert">
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
        <label className="kxd-portal-auth__label" htmlFor="partner-activate-password">
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
      </div>
      <div className="kxd-portal-auth__field">
        <label className="kxd-portal-auth__label" htmlFor="partner-activate-confirm">
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
    </form>
  );
}
