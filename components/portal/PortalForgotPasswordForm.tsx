"use client";

import { useState } from "react";
import Link from "next/link";

export function PortalForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/portal/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div>
        <p className="font-sans font-light" style={{ fontSize: "0.875rem", color: "var(--kxd-cream-muted)" }}>
          If an account exists for that email, a reset link has been sent.
        </p>
        <Link
          href="/portal/login"
          className="mt-6 inline-block font-sans uppercase"
          style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", color: "var(--kxd-gold)" }}
        >
          Back to sign in →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          className="mb-2 block font-sans uppercase"
          style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)" }}
        >
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        {loading ? "Sending…" : "Send Reset Link"}
      </button>
      <p className="text-center font-sans" style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.35)" }}>
        <Link href="/portal/login" style={{ color: "var(--kxd-gold)", opacity: 0.75 }}>
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
