"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function JuniorLoginForm() {
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
      const res = await fetch("/api/junior-creators/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Login failed.");
        return;
      }
      const redirect = searchParams.get("redirect") || "/junior-creators";
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p
          className="font-sans"
          style={{
            fontSize: "0.75rem",
            color: "rgba(210,90,90,0.9)",
            background: "rgba(210,90,90,0.08)",
            border: "1px solid rgba(210,90,90,0.25)",
            padding: "0.75rem 1rem",
          }}
        >
          {error}
        </p>
      )}
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
      <div>
        <label
          className="mb-2 block font-sans uppercase"
          style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)" }}
        >
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        className="w-full font-sans uppercase"
        style={{
          fontSize: "0.5rem",
          letterSpacing: "0.16em",
          fontWeight: 500,
          color: "#080808",
          background: "linear-gradient(180deg, #d4ba7a 0%, #c9a962 48%, #b09040 100%)",
          border: "none",
          padding: "0.875rem 1rem",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Signing in…" : "Enter Junior Creators"}
      </button>
    </form>
  );
}
