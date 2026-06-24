"use client";

import { useState, useMemo } from "react";
import {
  C, Input, Textarea, Select, FormSection, SuccessState, ErrorBar, SubmitRow,
  CreativePageHeader,
  type ClientOption, type ProjectOption,
} from "./shared";

export type { ClientOption, ProjectOption };

interface Props { clients: ClientOption[]; projects: ProjectOption[] }

export function BrandKitForm({ clients, projects }: Props) {
  const [form, setForm] = useState({
    client: "", relatedProject: "", brandName: "", industry: "",
    audience: "", status: "draft", internalNotes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState<{ id: number } | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    if (!form.client) return projects;
    return projects.filter(p => p.client === Number(form.client));
  }, [form.client, projects]);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      if (field === "client") {
        setForm(prev => ({ ...prev, client: e.target.value, relatedProject: "" }));
      } else {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
      }
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res  = await fetch("/api/admin/creative/brand-kits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!data.success) setError(data.error ?? "Something went wrong.");
      else setSubmitted({ id: data.id });
    } catch { setError("Network error — check your connection."); }
    finally { setSubmitting(false); }
  }

  function reset() {
    setForm({ client: "", relatedProject: "", brandName: "", industry: "", audience: "", status: "draft", internalNotes: "" });
    setSubmitted(null); setError(null);
  }

  if (submitted) {
    return (
      <SuccessState
        eyebrow="Brand Kit Created"
        headline="Brand kit created."
        detail="The brand kit record is now in Payload. Open it to fill in colors, voice, typography, and copy."
        recordId={submitted.id}
        payloadHref="/admin/collections/brand-kits"
        onReset={reset}
      />
    );
  }

  const canSubmit = !submitting && !!form.client && !!form.brandName.trim();

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans, WebkitFontSmoothing: "antialiased" }}>
      <CreativePageHeader subTitle="New Brand Kit" />
      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>
        <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.goldDim, marginBottom: "0.625rem" }}>KXD Creative Engine · New Brand Kit</p>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: C.cream, lineHeight: 1.1, letterSpacing: "-0.01em" }}>Create a Brand Kit</h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.35)", marginTop: "0.625rem" }}>Start a brand foundation. Fill colors, voice, and copy in Payload after creation.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <FormSection title="Client & Project">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Select label="Client" required value={form.client} onChange={set("client")}>
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                  {clients.length === 0 && <option disabled>No clients found</option>}
                </Select>
                <Select label="Related Project (optional)" value={form.relatedProject} onChange={set("relatedProject")}>
                  <option value="">No project</option>
                  {filteredProjects.map(p => <option key={p.id} value={String(p.id)}>{p.projectName}</option>)}
                </Select>
              </div>
            </FormSection>
            <FormSection title="Brand Details">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input label="Brand Name" required placeholder="e.g. Primal Motorsports" value={form.brandName} onChange={set("brandName")} />
                <Input label="Industry" placeholder="e.g. Motorsports, Hospitality, Retail" value={form.industry} onChange={set("industry")} />
              </div>
              <Textarea label="Target Audience" rows={2} placeholder="Who is this brand speaking to?" value={form.audience} onChange={set("audience")} />
              <Select label="Status" value={form.status} onChange={set("status")}>
                <option value="draft">Draft</option>
                <option value="in-review">In Review</option>
                <option value="approved">Approved</option>
                <option value="delivered">Delivered</option>
              </Select>
            </FormSection>
            <FormSection title="Internal Notes">
              <Textarea label="Internal Notes" rows={4} placeholder="Scope, reference links, or anything the team needs to know." value={form.internalNotes} onChange={set("internalNotes")} />
            </FormSection>
            {error && <ErrorBar message={error} />}
            <SubmitRow disabled={!canSubmit} submitting={submitting} label="Create Brand Kit" />
          </div>
        </form>
      </div>
    </div>
  );
}
