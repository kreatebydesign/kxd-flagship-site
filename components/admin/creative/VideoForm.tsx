"use client";

import { useState, useMemo } from "react";
import {
  C, Input, Textarea, Select, FormSection, SuccessState, ErrorBar, SubmitRow,
  CreativePageHeader, PRIORITY_OPTIONS,
  type ClientOption, type ProjectOption, type CampaignOption,
} from "./shared";

export type { ClientOption, ProjectOption, CampaignOption };

const VIDEO_TYPES = [
  { value: "",               label: "Select type…" },
  { value: "website-launch", label: "Website Launch" },
  { value: "case-study",     label: "Case Study" },
  { value: "promo",          label: "Promo" },
  { value: "highlight-reel", label: "Highlight Reel" },
  { value: "event-recap",    label: "Event Recap" },
  { value: "product-service",label: "Product / Service" },
  { value: "testimonial",    label: "Testimonial" },
  { value: "before-after",   label: "Before & After" },
  { value: "social-reel",    label: "Social Reel" },
  { value: "other",          label: "Other" },
];

const PLATFORMS = [
  { value: "",          label: "Select platform…" },
  { value: "facebook",  label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "reels",     label: "Reels" },
  { value: "stories",   label: "Stories" },
  { value: "linkedin",  label: "LinkedIn" },
  { value: "youtube",   label: "YouTube" },
  { value: "website",   label: "Website" },
  { value: "other",     label: "Other" },
];

const ASPECT_RATIOS = [
  { value: "",     label: "Select ratio…" },
  { value: "9:16", label: "9:16 (Vertical)" },
  { value: "1:1",  label: "1:1 (Square)" },
  { value: "4:5",  label: "4:5" },
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "custom", label: "Custom" },
];

const DURATIONS = [
  { value: "",      label: "Select duration…" },
  { value: "15s",   label: "15 seconds" },
  { value: "30s",   label: "30 seconds" },
  { value: "45s",   label: "45 seconds" },
  { value: "60s",   label: "60 seconds" },
  { value: "90s",   label: "90 seconds" },
  { value: "custom",label: "Custom" },
];

const VISUAL_STYLES = [
  { value: "",           label: "Select style…" },
  { value: "cinematic",  label: "Cinematic" },
  { value: "luxury",     label: "Luxury" },
  { value: "editorial",  label: "Editorial" },
  { value: "energetic",  label: "Energetic" },
  { value: "minimal",    label: "Minimal" },
  { value: "bold",       label: "Bold" },
  { value: "documentary",label: "Documentary" },
  { value: "other",      label: "Other" },
];

interface Props { clients: ClientOption[]; projects: ProjectOption[]; campaigns: CampaignOption[] }

export function VideoForm({ clients, projects, campaigns }: Props) {
  const [form, setForm] = useState({
    client: "", relatedProject: "", relatedCampaign: "", videoTitle: "",
    videoType: "", platform: "", aspectRatio: "", durationTarget: "",
    visualStyle: "", priority: "normal", goal: "", audience: "",
    websiteUrl: "", internalNotes: "", deadline: "",
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
      const res  = await fetch("/api/admin/creative/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!data.success) setError(data.error ?? "Something went wrong.");
      else setSubmitted({ id: data.id });
    } catch { setError("Network error — check your connection."); }
    finally { setSubmitting(false); }
  }

  function reset() {
    setForm({ client: "", relatedProject: "", relatedCampaign: "", videoTitle: "", videoType: "", platform: "", aspectRatio: "", durationTarget: "", visualStyle: "", priority: "normal", goal: "", audience: "", websiteUrl: "", internalNotes: "", deadline: "" });
    setSubmitted(null); setError(null);
  }

  if (submitted) {
    return (
      <SuccessState
        eyebrow="Video Request Logged"
        headline="Promo video request logged."
        detail="The video request is in Payload. Open it to add shot list, assets, and script direction."
        recordId={submitted.id}
        payloadHref="/admin/collections/promo-video-requests"
        onReset={reset}
      />
    );
  }

  const canSubmit = !submitting && !!form.client && !!form.videoTitle.trim();

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans, WebkitFontSmoothing: "antialiased" }}>
      <CreativePageHeader subTitle="New Promo Video" />
      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>
        <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.goldDim, marginBottom: "0.625rem" }}>KXD Creative Engine · New Promo Video</p>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: C.cream, lineHeight: 1.1, letterSpacing: "-0.01em" }}>Log a Promo Video Request</h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.35)", marginTop: "0.625rem" }}>Site launches, reels, highlight edits, and showcase content. Client and title required.</p>
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
            <FormSection title="Video Brief">
              <Input label="Video Title" required placeholder="e.g. Primal Motorsports — 2026 Season Launch Reel" value={form.videoTitle} onChange={set("videoTitle")} />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Select label="Video Type" value={form.videoType} onChange={set("videoType")}>
                  {VIDEO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
                <Select label="Platform" value={form.platform} onChange={set("platform")}>
                  {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
                <Select label="Priority" value={form.priority} onChange={set("priority")}>
                  {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
                <Select label="Aspect Ratio" value={form.aspectRatio} onChange={set("aspectRatio")}>
                  {ASPECT_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </Select>
                <Select label="Duration Target" value={form.durationTarget} onChange={set("durationTarget")}>
                  {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </Select>
                <Select label="Visual Style" value={form.visualStyle} onChange={set("visualStyle")}>
                  {VISUAL_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input label="Deadline" type="date" value={form.deadline} onChange={set("deadline")} />
                <Input label="Website URL (for screen capture)" type="url" placeholder="https://" value={form.websiteUrl} onChange={set("websiteUrl")} />
              </div>
              <Textarea label="Goal" rows={2} placeholder="What does this video need to achieve?" value={form.goal} onChange={set("goal")} />
            </FormSection>
            <FormSection title="Internal Notes">
              <Textarea label="Internal Notes" rows={4} value={form.internalNotes} onChange={set("internalNotes")} />
            </FormSection>
            {error && <ErrorBar message={error} />}
            <SubmitRow disabled={!canSubmit} submitting={submitting} label="Log Video Request" />
          </div>
        </form>
      </div>
    </div>
  );
}
