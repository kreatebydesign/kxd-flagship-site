"use client";

import { useState, useMemo } from "react";
import {
  C, Input, Textarea, Select, FormSection, SuccessState, ErrorBar, SubmitRow,
  CreativePageHeader, PRIORITY_OPTIONS,
  type ClientOption, type ProjectOption, type CampaignOption,
} from "./shared";

export type { ClientOption, ProjectOption, CampaignOption };

const POST_TYPES = [
  { value: "",                  label: "Select type…" },
  { value: "announcement",      label: "Announcement" },
  { value: "launch",            label: "Launch" },
  { value: "testimonial",       label: "Testimonial" },
  { value: "promo",             label: "Promo" },
  { value: "event",             label: "Event" },
  { value: "educational",       label: "Educational" },
  { value: "behind-the-scenes", label: "Behind the Scenes" },
  { value: "case-study",        label: "Case Study" },
  { value: "reminder",          label: "Reminder" },
  { value: "other",             label: "Other" },
];

const PLATFORMS = [
  { value: "",          label: "Select platform…" },
  { value: "facebook",  label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin",  label: "LinkedIn" },
  { value: "website",   label: "Website" },
  { value: "email",     label: "Email" },
  { value: "other",     label: "Other" },
];

interface Props { clients: ClientOption[]; projects: ProjectOption[]; campaigns: CampaignOption[] }

export function SocialPostForm({ clients, projects, campaigns }: Props) {
  const [form, setForm] = useState({
    client: "", relatedProject: "", relatedCampaign: "", postTitle: "",
    postType: "", platform: "", priority: "normal", audience: "",
    keyMessage: "", cta: "", internalNotes: "", scheduledDate: "",
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
      const res  = await fetch("/api/admin/creative/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!data.success) setError(data.error ?? "Something went wrong.");
      else setSubmitted({ id: data.id });
    } catch { setError("Network error — check your connection."); }
    finally { setSubmitting(false); }
  }

  function reset() {
    setForm({ client: "", relatedProject: "", relatedCampaign: "", postTitle: "", postType: "", platform: "", priority: "normal", audience: "", keyMessage: "", cta: "", internalNotes: "", scheduledDate: "" });
    setSubmitted(null); setError(null);
  }

  if (submitted) {
    return (
      <SuccessState
        eyebrow="Social Post Request Logged"
        headline="Social post request logged."
        detail="The post request is in Payload. Open it to add caption direction and generate copy."
        recordId={submitted.id}
        payloadHref="/admin/collections/social-post-requests"
        onReset={reset}
      />
    );
  }

  const canSubmit = !submitting && !!form.client && !!form.postTitle.trim();

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans, WebkitFontSmoothing: "antialiased" }}>
      <CreativePageHeader subTitle="New Social Post" />
      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>
        <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.goldDim, marginBottom: "0.625rem" }}>KXD Creative Engine · New Social Post</p>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: C.cream, lineHeight: 1.1, letterSpacing: "-0.01em" }}>Log a Social Post Request</h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.35)", marginTop: "0.625rem" }}>Captions, hashtags, and campaign copy. Client and title required.</p>
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
            <FormSection title="Post Details">
              <Input label="Post Title" required placeholder="e.g. SPUR — Sunday Brunch Promo" value={form.postTitle} onChange={set("postTitle")} />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Select label="Post Type" value={form.postType} onChange={set("postType")}>
                  {POST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
                <Select label="Platform" value={form.platform} onChange={set("platform")}>
                  {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
                <Select label="Priority" value={form.priority} onChange={set("priority")}>
                  {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
                <Input label="Scheduled Date" type="date" value={form.scheduledDate} onChange={set("scheduledDate")} />
              </div>
              <Textarea label="Key Message" rows={3} placeholder="What's the core message this post needs to communicate?" value={form.keyMessage} onChange={set("keyMessage")} />
              <Input label="Call to Action" placeholder="e.g. Reserve a table at spurrestaurant.com" value={form.cta} onChange={set("cta")} />
            </FormSection>
            <FormSection title="Internal Notes">
              <Textarea label="Internal Notes" rows={3} value={form.internalNotes} onChange={set("internalNotes")} />
            </FormSection>
            {error && <ErrorBar message={error} />}
            <SubmitRow disabled={!canSubmit} submitting={submitting} label="Log Social Post" />
          </div>
        </form>
      </div>
    </div>
  );
}
