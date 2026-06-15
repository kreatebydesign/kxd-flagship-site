"use client";

/**
 * components/admin/creative/ReelForm.tsx
 * KXD Creative Engine — Phase 5A
 *
 * Website Showcase Reel creation form.
 * Creates a PromoVideoRequest record with isWebsiteReel: true.
 */

import { useState, useMemo } from "react";
import {
  C, Input, Textarea, Select, FormSection, SuccessState, ErrorBar, SubmitRow,
  CreativePageHeader, PRIORITY_OPTIONS,
  type ClientOption, type ProjectOption, type CampaignOption,
} from "./shared";

export type { ClientOption, ProjectOption, CampaignOption };

const PLATFORMS = [
  { value: "",               label: "Select platform…" },
  { value: "instagram-reel", label: "Instagram Reel" },
  { value: "facebook-reel",  label: "Facebook Reel" },
  { value: "tiktok",         label: "TikTok" },
  { value: "linkedin",       label: "LinkedIn" },
  { value: "youtube",        label: "YouTube" },
  { value: "website",        label: "Website Embed" },
  { value: "other",          label: "Other" },
];

const VISUAL_STYLES = [
  { value: "",             label: "Select style…" },
  { value: "cinematic",    label: "Cinematic" },
  { value: "luxury",       label: "Luxury" },
  { value: "editorial",    label: "Editorial" },
  { value: "launch-reveal",label: "Launch Reveal" },
  { value: "case-study",   label: "Case Study" },
  { value: "energetic",    label: "Energetic" },
  { value: "minimal",      label: "Minimal" },
  { value: "bold",         label: "Bold" },
  { value: "documentary",  label: "Documentary" },
];

const DURATIONS = [
  { value: "",      label: "Select duration…" },
  { value: "15s",   label: "15 seconds" },
  { value: "30s",   label: "30 seconds" },
  { value: "45s",   label: "45 seconds" },
  { value: "60s",   label: "60 seconds" },
  { value: "90s",   label: "90 seconds" },
];

const ASPECT_RATIOS = [
  { value: "",      label: "Select ratio…" },
  { value: "9:16",  label: "9:16 Vertical" },
  { value: "1:1",   label: "1:1 Square" },
  { value: "16:9",  label: "16:9 Landscape" },
  { value: "4:5",   label: "4:5" },
];

interface Props {
  clients:   ClientOption[];
  projects:  ProjectOption[];
  campaigns: CampaignOption[];
}

export function ReelForm({ clients, projects, campaigns }: Props) {
  const [form, setForm] = useState({
    client:         "",
    relatedProject: "",
    relatedCampaign:"",
    videoTitle:     "",
    clientName:     "",
    websiteUrl:     "",
    platform:       "",
    visualStyle:    "",
    durationTarget: "",
    aspectRatio:    "",
    priority:       "normal",
    goal:           "",
    audience:       "",
    musicDirection: "",
    internalNotes:  "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState<{ id: number } | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const filteredProjects  = useMemo(
    () => !form.client ? projects  : projects.filter(p => p.client === Number(form.client)),
    [form.client, projects]
  );
  const filteredCampaigns = useMemo(
    () => !form.client ? campaigns : campaigns.filter(c => c.client === Number(form.client)),
    [form.client, campaigns]
  );

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
      const res = await fetch("/api/admin/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, videoType: "website-launch" }),
      });
      const data = await res.json();
      if (!data.success) setError(data.error ?? "Something went wrong.");
      else setSubmitted({ id: data.id });
    } catch {
      setError("Network error — check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setForm({
      client: "", relatedProject: "", relatedCampaign: "", videoTitle: "", clientName: "",
      websiteUrl: "", platform: "", visualStyle: "", durationTarget: "", aspectRatio: "",
      priority: "normal", goal: "", audience: "", musicDirection: "", internalNotes: "",
    });
    setSubmitted(null);
    setError(null);
  }

  if (submitted) {
    return (
      <SuccessState
        eyebrow="Reel Request Created"
        headline="Website reel request logged."
        detail="Return to the Reels dashboard to capture screenshots and generate the storyboard."
        recordId={submitted.id}
        backHref="/admin/operations/reels"
        backLabel="Return to Reels Dashboard"
        anotherLabel="Create Another Reel"
        payloadHref="/admin/collections/promo-video-requests"
        onReset={reset}
      />
    );
  }

  const canSubmit = !submitting && !!form.client && !!form.videoTitle.trim() && !!form.websiteUrl.trim();

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans, WebkitFontSmoothing: "antialiased" }}>
      <CreativePageHeader subTitle="Website Showcase Reel" />

      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.goldDim, marginBottom: "0.625rem" }}>
            KXD OS · Phase 5A · Reel Generator
          </p>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: C.cream, lineHeight: 1.1, letterSpacing: "-0.01em" }}>
            New Website Showcase Reel
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.35)", marginTop: "0.625rem", maxWidth: "42rem", lineHeight: 1.6 }}>
            Enter the client website URL. After creating the request, capture screenshots and generate the reel storyboard from the Reels dashboard.
          </p>
        </div>

        {/* Pipeline steps — visual guide */}
        <div style={{ display: "flex", gap: "0", marginBottom: "2.5rem", background: C.bgElevated, border: `1px solid ${C.border}` }}>
          {[
            { step: "01", label: "Brief",       note: "Fill this form",         active: true  },
            { step: "02", label: "Screenshots", note: "Capture website",        active: false },
            { step: "03", label: "Storyboard",  note: "Generate with AI",       active: false },
            { step: "04", label: "Review",      note: "Approve & deliver",      active: false },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: "1rem", borderRight: i < 3 ? `1px solid ${C.border}` : undefined, opacity: s.active ? 1 : 0.35 }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.2em", color: s.active ? C.gold : C.goldDim, marginBottom: "0.375rem" }}>
                {s.step}
              </p>
              <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.625rem", color: C.cream, marginBottom: "0.125rem" }}>
                {s.label}
              </p>
              <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: "rgba(255,255,255,0.25)" }}>
                {s.note}
              </p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

            <FormSection title="Client & Website">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Select label="Client" required value={form.client} onChange={set("client")}>
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </Select>
                <Input
                  label="Client Display Name (optional override)"
                  placeholder="e.g. Primal Motorsports"
                  value={form.clientName}
                  onChange={set("clientName")}
                />
              </div>
              <Input
                label="Website URL"
                required
                type="url"
                placeholder="https://primalmotorsports.com"
                value={form.websiteUrl}
                onChange={set("websiteUrl")}
              />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

            <FormSection title="Reel Brief">
              <Input
                label="Reel Title"
                required
                placeholder="e.g. Primal Motorsports — 2026 Website Launch Reel"
                value={form.videoTitle}
                onChange={set("videoTitle")}
              />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Select label="Platform" value={form.platform} onChange={set("platform")}>
                  {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
                <Select label="Visual Style" value={form.visualStyle} onChange={set("visualStyle")}>
                  {VISUAL_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
                <Select label="Duration Target" value={form.durationTarget} onChange={set("durationTarget")}>
                  {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </Select>
                <Select label="Aspect Ratio" value={form.aspectRatio} onChange={set("aspectRatio")}>
                  {ASPECT_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </Select>
                <Select label="Priority" value={form.priority} onChange={set("priority")}>
                  {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
              </div>
              <Textarea
                label="Goal"
                rows={2}
                placeholder="What does this reel need to achieve? e.g. Drive DMs from local contractors seeing the site for the first time."
                value={form.goal}
                onChange={set("goal")}
              />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label="Target Audience"
                  placeholder="e.g. Local contractors, homeowners 35–55, Metro Phoenix"
                  value={form.audience}
                  onChange={set("audience")}
                />
                <Input
                  label="Music Direction (optional)"
                  placeholder="e.g. Cinematic, 90 BPM, tension-building"
                  value={form.musicDirection}
                  onChange={set("musicDirection")}
                />
              </div>
            </FormSection>

            <FormSection title="Internal Notes">
              <Textarea
                label="Internal Notes"
                rows={3}
                placeholder="Anything the editor needs to know — client preferences, restrictions, reference reels."
                value={form.internalNotes}
                onChange={set("internalNotes")}
              />
            </FormSection>

            {error && <ErrorBar message={error} />}

            <SubmitRow
              disabled={!canSubmit}
              submitting={submitting}
              label="Create Reel Request"
              loadingLabel="Creating…"
              backHref="/admin/operations/reels"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
