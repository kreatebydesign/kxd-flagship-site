"use client";

import { useState, useMemo } from "react";
import {
  C, Input, Textarea, Select, FormSection, SuccessState, ErrorBar, SubmitRow,
  CreativePageHeader, PRIORITY_OPTIONS,
  type ClientOption, type ProjectOption,
} from "./shared";

export type { ClientOption, ProjectOption };

const CAMPAIGN_TYPES = [
  { value: "",               label: "Select type…" },
  { value: "launch",         label: "Launch" },
  { value: "event",          label: "Event" },
  { value: "promotion",      label: "Promotion" },
  { value: "seasonal",       label: "Seasonal" },
  { value: "content-series", label: "Content Series" },
  { value: "website-launch", label: "Website Launch" },
  { value: "brand-launch",   label: "Brand Launch" },
  { value: "announcement",   label: "Announcement" },
  { value: "other",          label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "draft",    label: "Draft" },
  { value: "planning", label: "Planning" },
  { value: "active",   label: "Active" },
];

interface Props { clients: ClientOption[]; projects: ProjectOption[] }

export function CampaignForm({ clients, projects }: Props) {
  const [form, setForm] = useState({
    client: "", relatedProject: "", campaignTitle: "", campaignType: "",
    status: "draft", priority: "normal", goal: "", audience: "", internalNotes: "",
    launchDate: "", deadline: "",
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
      const res  = await fetch("/api/admin/creative/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!data.success) setError(data.error ?? "Something went wrong.");
      else setSubmitted({ id: data.id });
    } catch { setError("Network error — check your connection."); }
    finally { setSubmitting(false); }
  }

  function reset() {
    setForm({ client: "", relatedProject: "", campaignTitle: "", campaignType: "", status: "draft", priority: "normal", goal: "", audience: "", internalNotes: "", launchDate: "", deadline: "" });
    setSubmitted(null); setError(null);
  }

  if (submitted) {
    return (
      <SuccessState
        eyebrow="Campaign Created"
        headline="Campaign created."
        detail="The campaign has been created and is visible in the Creative Engine."
        recordId={submitted.id}
        payloadHref="/admin/collections/creative-campaigns"
        onReset={reset}
      />
    );
  }

  const canSubmit = !submitting && !!form.client && !!form.campaignTitle.trim();

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans, WebkitFontSmoothing: "antialiased" }}>
      <CreativePageHeader subTitle="New Campaign" />
      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>
        <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.goldDim, marginBottom: "0.625rem" }}>KXD Creative Engine · New Campaign</p>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: C.cream, lineHeight: 1.1, letterSpacing: "-0.01em" }}>Create a Campaign</h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.35)", marginTop: "0.625rem" }}>Track a full creative or marketing campaign. Client and title required.</p>
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
            <FormSection title="Campaign Details">
              <Input label="Campaign Title" required placeholder="e.g. Primal Motorsports — Summer 2026 Launch" value={form.campaignTitle} onChange={set("campaignTitle")} />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Select label="Campaign Type" value={form.campaignType} onChange={set("campaignType")}>
                  {CAMPAIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
                <Select label="Status" value={form.status} onChange={set("status")}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
                <Select label="Priority" value={form.priority} onChange={set("priority")}>
                  {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
              </div>
              <Textarea label="Goal" rows={3} placeholder="What does this campaign need to achieve?" value={form.goal} onChange={set("goal")} />
              <Textarea label="Target Audience" rows={2} placeholder="Who is this for?" value={form.audience} onChange={set("audience")} />
            </FormSection>
            <FormSection title="Dates">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input label="Launch Date" type="date" value={form.launchDate} onChange={set("launchDate")} />
                <Input label="Deadline" type="date" value={form.deadline} onChange={set("deadline")} />
              </div>
            </FormSection>
            <FormSection title="Internal Notes">
              <Textarea label="Internal Notes" rows={4} placeholder="Scope, context, decisions — not visible to clients." value={form.internalNotes} onChange={set("internalNotes")} />
            </FormSection>
            {error && <ErrorBar message={error} />}
            <SubmitRow disabled={!canSubmit} submitting={submitting} label="Create Campaign" />
          </div>
        </form>
      </div>
    </div>
  );
}
