"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormState = "idle" | "submitting" | "error";

export function WebsiteAuditForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setError("");

    try {
      const res = await fetch("/api/website-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, website }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Audit failed. Please try again.");
        setState("error");
        return;
      }
      router.push(`/website-audit/results/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
      setState("error");
    } finally {
      setState("idle");
    }
  }

  const inputStyle = {
    background: "var(--kxd-black-elevated)",
    border: "1px solid var(--kxd-border-white)",
    color: "var(--kxd-cream)",
    padding: "0.875rem 1rem",
    fontSize: "0.875rem",
    width: "100%",
  } as const;

  const labelStyle = {
    fontSize: "0.5rem",
    letterSpacing: "0.14em",
    color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase" as const,
    marginBottom: "0.5rem",
    display: "block",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p
          className="font-sans"
          style={{
            fontSize: "0.8125rem",
            color: "rgba(210,90,90,0.9)",
            background: "rgba(210,90,90,0.08)",
            border: "1px solid rgba(210,90,90,0.25)",
            padding: "0.875rem 1rem",
          }}
        >
          {error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="font-sans" style={labelStyle}>Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            className="font-sans"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="font-sans" style={labelStyle}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            className="font-sans"
            placeholder="you@company.com"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="font-sans" style={labelStyle}>Company</label>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            style={inputStyle}
            className="font-sans"
            placeholder="Company name"
          />
        </div>
        <div>
          <label className="font-sans" style={labelStyle}>Website URL</label>
          <input
            type="url"
            required
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            style={inputStyle}
            className="font-sans"
            placeholder="https://yourcompany.com"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={state === "submitting"}
        className="kxd-btn-primary font-sans uppercase disabled:opacity-50"
        style={{ fontSize: "0.625rem", letterSpacing: "0.14em", marginTop: "0.5rem" }}
      >
        {state === "submitting" ? "Analyzing Website…" : "Submit Audit →"}
      </button>

      <p
        className="font-sans font-light"
        style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.28)", lineHeight: 1.6 }}
      >
        Free instant report. No spam. KXD uses this to prepare a relevant strategy conversation.
      </p>
    </form>
  );
}
