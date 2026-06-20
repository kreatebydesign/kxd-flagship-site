"use client";

import { useState } from "react";

type ProjectOption = { id: number; name: string };

export function NewRequestForm({ projects }: { projects: ProjectOption[] }) {
  const [requestTitle, setRequestTitle] = useState("");
  const [requestType, setRequestType] = useState("update");
  const [requestDetails, setRequestDetails] = useState("");
  const [relatedProject, setRelatedProject] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        requestTitle,
        requestType,
        requestDetails,
      };
      if (relatedProject) body.relatedProject = Number(relatedProject);

      const res = await fetch("/api/portal/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to submit request.");
        return;
      }
      setSuccess(true);
      setRequestTitle("");
      setRequestDetails("");
      setRelatedProject("");
    } catch {
      setError("Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <p
        className="font-sans"
        style={{
          fontSize: "0.8125rem",
          color: "rgba(94,198,140,0.9)",
          background: "rgba(94,198,140,0.07)",
          border: "1px solid rgba(94,198,140,0.25)",
          padding: "1rem 1.25rem",
        }}
      >
        Request submitted. The KXD team will review it shortly.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <label className="mb-2 block font-sans uppercase" style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)" }}>
          Request Title
        </label>
        <input
          required
          value={requestTitle}
          onChange={(e) => setRequestTitle(e.target.value)}
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block font-sans uppercase" style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)" }}>
            Type
          </label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
            className="w-full font-sans"
            style={{
              background: "var(--kxd-black-elevated)",
              border: "1px solid var(--kxd-border-white)",
              color: "var(--kxd-cream)",
              padding: "0.75rem 1rem",
              fontSize: "0.875rem",
            }}
          >
            <option value="update">Update</option>
            <option value="bug">Bug</option>
            <option value="design">Design</option>
            <option value="content">Content</option>
            <option value="seo">SEO</option>
            <option value="strategy">Strategy</option>
            <option value="access">Access</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block font-sans uppercase" style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)" }}>
            Related Project
          </label>
          <select
            value={relatedProject}
            onChange={(e) => setRelatedProject(e.target.value)}
            className="w-full font-sans"
            style={{
              background: "var(--kxd-black-elevated)",
              border: "1px solid var(--kxd-border-white)",
              color: "var(--kxd-cream)",
              padding: "0.75rem 1rem",
              fontSize: "0.875rem",
            }}
          >
            <option value="">None</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-2 block font-sans uppercase" style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)" }}>
          Details
        </label>
        <textarea
          rows={4}
          value={requestDetails}
          onChange={(e) => setRequestDetails(e.target.value)}
          className="w-full font-sans"
          style={{
            background: "var(--kxd-black-elevated)",
            border: "1px solid var(--kxd-border-white)",
            color: "var(--kxd-cream)",
            padding: "0.75rem 1rem",
            fontSize: "0.875rem",
            resize: "vertical",
          }}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="kxd-btn-primary font-sans uppercase disabled:opacity-50"
        style={{ fontSize: "0.625rem", letterSpacing: "0.14em" }}
      >
        {loading ? "Submitting…" : "Submit Request"}
      </button>
    </form>
  );
}
