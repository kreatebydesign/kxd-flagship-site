"use client";

import { useState, useMemo } from "react";
import {
  C, Input, Textarea, Select, FormSection, SuccessState, ErrorBar, SubmitRow,
  CreativePageHeader, PRIORITY_OPTIONS,
  type ClientOption, type ProjectOption, type CampaignOption,
} from "./shared";

export type { ClientOption, ProjectOption, CampaignOption };

const FLYER_TYPES = [
  { value: "",             label: "Select type…" },
  { value: "event",        label: "Event" },
  { value: "promotion",    label: "Promotion" },
  { value: "announcement", label: "Announcement" },
  { value: "hiring",       label: "Hiring" },
  { value: "menu",         label: "Menu" },
  { value: "fundraiser",   label: "Fundraiser" },
  { value: "launch",       label: "Launch" },
  { value: "social-square",label: "Social Square" },
  { value: "story",        label: "Story" },
  { value: "print",        label: "Print" },
  { value: "other",        label: "Other" },
];

const SIZE_FORMATS = [
  { value: "",          label: "Select format…" },
  { value: "square",    label: "Square (1:1)" },
  { value: "story",     label: "Story (9:16)" },
  { value: "portrait",  label: "Portrait" },
  { value: "landscape", label: "Landscape" },
  { value: "letter",    label: "Letter (8.5×11)" },
  { value: "poster",    label: "Poster" },
  { value: "custom",    label: "Custom" },
];

interface Props { clients: ClientOption[]; projects: ProjectOption[]; campaigns: CampaignOption[] }

export function FlyerForm({ clients, projects, campaigns }: Props) {
  const [form, setForm] = useState({
    client: "", relatedProject: "", relatedCampaign: "", flyerTitle: "",
    flyerType: "", sizeFormat: "", priority: "normal", audience: "",
    keyDetails: "", cta: "", deadline: "", internalNotes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState<{ id: number } | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const filteredProjects  = useMemo(() => !form.client ? projects  : projects.filter(p => p.client === Number(form.client)), [form.client, projects]);
  const filteredCampaigns = useMemo(() => !form.client ? campaigns : campaigns.filter(c => c.client === Number(form.client)), [form.client, campaigns]);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      if (field === "client") {
        setForm(prev => ({ ...prev, client: e.target.value, relatedProject: "", relatedCampaign: "" }));
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
      const res  = await fetch("/api/admin/creative/flyers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!data.success) setError(data.error ?? "Something went wrong.");
      else setSubmitted({ id: data.id });
    } catch { setError("Network error — check your connection."); }
    finally { setSubmitting(false); }
  }

  function reset() {
    setForm({ client: "", relatedProject: "", relatedCampaign: "", flyerTitle: "", flyerType: "", sizeFormat: "", priority: "normal", audience: "", keyDetails: "", cta: "", deadline: "", internalNotes: "" });
    setSubmitted(null); setError(null);
  }

  if (submitted) {
    return (
      <SuccessState
        eyebrow="Flyer Request Logged"
        headline="Flyer request logged."
        detail="The flyer request has been created. Open it in Payload to add assets and design direction."
        recordId={submitted.id}
        payloadHref="/admin/collections/flyer-requests"
        onReset={reset}
      />
    );
  }

  const canSubmit = !submitting && !!form.client && !!form.flyerTitle.trim();

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans, WebkitFontSmoothing: "antialiased" }}>
      <CreativePageHeader subTitle="New Flyer Request" />
      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>
        <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.goldDim, marginBottom: "0.625rem" }}>KXD Creative Engine · New Flyer Request</p>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: C.cream, lineHeight: 1.1, letterSpacing: "-0.01em" }}>Log a Flyer Request</h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.35)", marginTop: "0.625rem" }}>Client and flyer title required. Full assets and direction can be added in Payload.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <FormSection title="Client & Context">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Select label="Client" required value={form.client} onChange={set("client")}>
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </Select>
                <Select label="Related Project (optional)" value={form.relatedProject} onChange={set("relatedProject")}>
                  <option value="">No project</option>
                  {filteredProjects.map(p => <option key={p.id} value={String(p.id)}>{p.projectName}</option>)}
                </Select>
                <Select label="Related Campaign (optional)" value={form.relatedCampaign} onChange={set("relatedCampaign")}>
                  <option value="">No campaign</option>
                  {filteredCampaigns.map(c => <option key={c.id} value={String(c.id)}>{c.campaignTitle}</option>)}
                </Select>
              </div>
            </FormSection>
            <FormSection title="Flyer Details">
              <Input label="Flyer Title" required placeholder="e.g. Plate the Umpqua — Mother's Day Promo" value={form.flyerTitle} onChange={set("flyerTitle")} />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Select label="Flyer Type" value={form.flyerType} onChange={set("flyerType")}>
                  {FLYER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
                <Select label="Size / Format" value={form.sizeFormat} onChange={set("sizeFormat")}>
                  {SIZE_FORMATS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
                <Select label="Priority" value={form.priority} onChange={set("priority")}>
                  {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
                <Input label="Deadline" type="date" value={form.deadline} onChange={set("deadline")} />
              </div>
              <Input label="Target Audience" placeholder="e.g. Existing customers, local community" value={form.audience} onChange={set("audience")} />
              <Textarea label="Key Details" rows={4} placeholder="Date, time, location, names, pricing — anything that must appear on the flyer." value={form.keyDetails} onChange={set("keyDetails")} />
              <Input label="Call to Action" placeholder="e.g. Book now at placetheumpqua.com" value={form.cta} onChange={set("cta")} />
            </FormSection>
            <FormSection title="Internal Notes">
              <Textarea label="Internal Notes" rows={3} value={form.internalNotes} onChange={set("internalNotes")} />
            </FormSection>
            {error && <ErrorBar message={error} />}
            <SubmitRow disabled={!canSubmit} submitting={submitting} label="Log Flyer Request" />
          </div>
        </form>
      </div>
    </div>
  );
}
