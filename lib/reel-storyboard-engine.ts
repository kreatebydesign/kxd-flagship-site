/**
 * lib/reel-storyboard-engine.ts
 * KXD Creative Engine — Phase 5A
 *
 * Assembles brand-aware, KXD-quality reel storyboard prompts
 * for website showcase reels.
 *
 * Output: structured storyboard with scene sequence, hook,
 * on-screen text, timing, transitions, captions, CTA, and music direction.
 *
 * KXD Prompt Standards:
 *   — No generic AI phrasing ("Your brand story", "Transform your business!")
 *   — Every scene must be actionable enough for an editor to execute
 *   — Hook must stop the scroll in the first 2–3 seconds
 *   — Platform-native structure (Instagram Reel ≠ LinkedIn ≠ TikTok)
 *   — Timing is mandatory — editors work on frame counts, not vibes
 */

import { type BrandContext, tierToneGuidance } from "./creative-brand-resolver";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReelScene {
  number:          number;
  title:           string;
  timeIn:          string;
  timeOut:         string;
  duration:        string;
  screenshotRef:   "hero" | "services" | "testimonials" | "cta-footer" | "full-brand" | "custom";
  onScreenText:    string;
  voiceover:       string | null;
  visualNote:      string;
  transition:      string;
  moodNote:        string;
}

export interface ReelStoryboardOutput {
  reelTitle:       string;
  hook:            string;
  scenes:          ReelScene[];
  totalDuration:   string;
  transitionStyle: string;
  captionOptions:  string[];
  cta:             string;
  musicDirection:  string;
  hashtagOptions:  string[];
  productionNotes: string;
}

export interface ReelPromptInput {
  brand:         BrandContext;
  videoTitle:    string;
  websiteUrl:    string;
  clientName:    string;
  platform:      string | null;
  visualStyle:   string | null;
  durationTarget: string | null;
  goal:          string | null;
  audience:      string | null;
  musicDirection: string | null;
  capturedSections: string[];
}

export interface AssembledReelPrompt {
  systemPrompt: string;
  userPrompt:   string;
  fullPrompt:   string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function section(label: string, value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return `${label}:\n${value.trim()}\n`;
}

function platformSpec(platform: string | null): string {
  const specs: Record<string, string> = {
    "instagram-reel": "Instagram Reel — 9:16 vertical, 15–90s, first 1s hooks or loses the scroll. On-screen text in top 60% of frame (avoid TikTok UI zone at bottom). Captions auto-on, design for silent viewing. Hook must be visual — not a talking head.",
    "facebook-reel":  "Facebook Reel — 9:16 vertical, up to 90s. Algorithm favors 30–45s with strong completion rate. Caption is critical — most users watch muted. Hook within first 3s.",
    "tiktok":         "TikTok — 9:16 vertical, 15–60s optimal for organic. Hook in the first 2s or swipe. Pattern interrupts every 5–7s. Text overlays are part of the visual. Trending audio increases reach but brand audio builds identity.",
    "linkedin":       "LinkedIn Video — 16:9 or 1:1, 30–90s optimal. Professional context — hook must lead with insight or result. Captions essential (85% watch muted). Avoid entertainment-first hooks; lead with value.",
    "website":        "Website embed — 16:9 landscape, autoplay muted. Loop is fine. Hero placement means the reel must communicate in 5s without sound. Text overlays carry the full message.",
  };
  const key = (platform || "").toLowerCase();
  return specs[key] || "Standard short-form vertical video. 9:16 preferred for social. 15–60s optimal. Hook in first 3s. Design for silent viewing with captions.";
}

function styleSpec(style: string | null): string {
  const specs: Record<string, string> = {
    cinematic:       "Cinematic: slow push-ins, cinematic color grade, dramatic black bars (optional), score-driven pacing. Let the visuals breathe — don't rush cuts. Motion: smooth eases, no jump cuts.",
    luxury:          "Luxury: restraint over excess. Long, deliberate cuts. Negative space. Serif typography on screen. Gold or monochrome palette. Silence before the hook. Transition: dissolve or elegant wipe.",
    editorial:       "Editorial: grid-aware compositions, strong typography hierarchy, magazine-style cuts. Bold headline cards between scenes. Transition: hard cut, photo reveal, or type animation.",
    "launch-reveal":  "Launch Reveal: builds anticipation. Begins dark/obscured → progressive reveal → full brand moment at the peak. Transition: iris reveal, light burst, or whip pan. Score: builds to crescendo.",
    "case-study":    "Case Study: documentary rhythm — problem → process → result. On-screen stats and quotes carry credibility. Transition: clean cut with data cards. Avoid hype; let results speak.",
    energetic:       "Energetic: fast cuts (0.5–1.5s per scene), kinetic text, high-contrast visuals. Tempo locked to music. Transition: whip pan, smash cut, flash frame.",
    minimal:         "Minimal: extended holds, single focal point per scene, generous white space. Typography is the design. Transition: dissolve or simple fade.",
    bold:            "Bold: full-bleed color, high-contrast type, punchy copy. Graphic shapes and overlays. Transition: hard cut with graphic wipe.",
    documentary:     "Documentary: candid, authentic. Interview-style clips or B-roll. On-screen text adds context, not decoration. Score: ambient, understated.",
  };
  const key = (style || "").toLowerCase();
  return specs[key] || "Premium, brand-appropriate. Clean transitions. Typography-led. Platform-native pacing.";
}

function durationGuide(duration: string | null): { totalSeconds: number; sceneCount: number; sceneDuration: string } {
  const map: Record<string, { totalSeconds: number; sceneCount: number; sceneDuration: string }> = {
    "15s": { totalSeconds: 15, sceneCount: 4,  sceneDuration: "2–4s per scene" },
    "30s": { totalSeconds: 30, sceneCount: 6,  sceneDuration: "3–5s per scene" },
    "45s": { totalSeconds: 45, sceneCount: 7,  sceneDuration: "4–7s per scene" },
    "60s": { totalSeconds: 60, sceneCount: 8,  sceneDuration: "5–8s per scene" },
    "90s": { totalSeconds: 90, sceneCount: 10, sceneDuration: "6–10s per scene" },
  };
  return map[duration || "30s"] || map["30s"];
}

// ── Screenshot section mapping ─────────────────────────────────────────────────

const SCREENSHOT_SECTIONS = [
  { ref: "hero",         label: "Hero / Above the fold",    order: 1 },
  { ref: "services",     label: "Services / Features",       order: 2 },
  { ref: "testimonials", label: "Testimonials / Social proof",order: 3 },
  { ref: "cta-footer",   label: "CTA / Footer",              order: 4 },
  { ref: "full-brand",   label: "Full-page brand overview",  order: 5 },
];

// ── Prompt assembler ──────────────────────────────────────────────────────────

export function assembleReelStoryboardPrompt(input: ReelPromptInput): AssembledReelPrompt {
  const { brand } = input;
  const toneGuidance = tierToneGuidance(brand.clientTier);
  const pSpec = platformSpec(input.platform);
  const sSpec = styleSpec(input.visualStyle);
  const dur   = durationGuide(input.durationTarget);

  const systemPrompt = `You are the KXD lead creative director specializing in website showcase reels. KXD produces premium short-form video content for high-value clients — design studios, service businesses, professionals, and brands.

Your role: generate a complete, production-ready reel storyboard from website screenshots. The storyboard must be specific enough for an editor to execute without a briefing call.

KXD Reel Standards:
- The hook wins or loses the reel. It must be in the first 2–3 seconds.
- Every scene must reference a specific screenshot section (hero, services, testimonials, cta-footer, full-brand).
- On-screen text must be short, punchy, and brand-voice accurate. No placeholder copy.
- Timing must be specific — editors work with timecodes, not vague guidance.
- Captions must be self-contained — they are read without the video.
- Music direction must name a genre, tempo, and mood — not "upbeat track" or "something cinematic".
- CTA must be specific — not "Learn More" or "Visit our website".
- No generic AI phrasing: no "elevate", "transform", "game-changing", "cutting-edge", "unleash".
- Output must be valid JSON matching the exact schema. Zero prose outside the JSON.`;

  const brandBlock = [
    `BRAND: ${brand.brandKitName ?? brand.clientName}`,
    `CLIENT: ${brand.clientName}`,
    `WEBSITE: ${input.websiteUrl}`,
    `TIER: ${brand.clientTier}`,
    `TONE: ${toneGuidance}`,
    section("VOICE & TONE", brand.voiceTone),
    section("BRAND PERSONALITY", brand.brandPersonality),
    section("POSITIONING", brand.positioningStatement),
    section("BRAND KEYWORDS", brand.brandKeywords),
    section("DO", brand.doRules),
    section("DON'T", brand.dontRules),
    section("PRIMARY CTA", brand.primaryCTA),
    section("AUDIENCE", brand.audience || input.audience),
    section("TAGLINES", brand.taglineOptions),
    section("INDUSTRY", brand.industry),
  ].filter(Boolean).join("\n");

  const reelBriefBlock = [
    `REEL TITLE BRIEF: ${input.videoTitle}`,
    section("PLATFORM", `${input.platform ?? "Not specified"} — ${pSpec}`),
    section("VISUAL STYLE", `${input.visualStyle ?? "Not specified"} — ${sSpec}`),
    section("DURATION", `${input.durationTarget ?? "30s"} — Target ${dur.sceneCount} scenes at ${dur.sceneDuration}`),
    section("GOAL", input.goal),
    section("AUDIENCE", input.audience),
    section("MUSIC DIRECTION", input.musicDirection),
  ].filter(Boolean).join("\n");

  const screenshotsBlock = [
    "CAPTURED WEBSITE SECTIONS (use these as scene source material):",
    ...SCREENSHOT_SECTIONS.map(s => `  ${s.order}. ${s.ref} — ${s.label}`),
    "",
    "Map each scene to the most appropriate screenshot section.",
    "Prioritize hero and testimonials — they carry the most emotional and credibility weight.",
  ].join("\n");

  const campaignBlock = brand.campaignId ? [
    `CAMPAIGN: ${brand.campaignTitle ?? "Unnamed"}`,
    section("CAMPAIGN MESSAGE", brand.campaignMessage),
    section("CAMPAIGN GOAL", brand.campaignGoal),
    section("CAMPAIGN CTA", brand.campaignCTA),
  ].filter(Boolean).join("\n") : "";

  const outputSchema = `OUTPUT SCHEMA — return valid JSON only, no text outside the JSON object:
{
  "reelTitle": "Platform-native reel title — 6 words max. Hook-forward. Do not use the website domain name.",
  "hook": "Opening hook line (0:00–0:03). 5 words max. Stops the scroll. Visual + text working together. Must be the most compelling statement about this website/brand.",
  "scenes": [
    {
      "number": 1,
      "title": "Scene name — 3 words max",
      "timeIn": "0:00",
      "timeOut": "0:04",
      "duration": "4s",
      "screenshotRef": "hero",
      "onScreenText": "Exact on-screen text — short, punchy, brand-voice. Under 8 words.",
      "voiceover": "Optional voiceover line, or null if this scene is text/music-led",
      "visualNote": "Camera motion, animation, or zoom direction for the editor. e.g. 'Slow push-in from center. Slight vignette.'",
      "transition": "Exact transition to next scene. e.g. 'Whip pan right' or 'Hard cut' or 'Dissolve 8f'",
      "moodNote": "The emotional tone of this specific scene. 1 sentence."
    }
  ],
  "totalDuration": "0:30",
  "transitionStyle": "Overall transition language for the reel — 1 sentence. e.g. 'Smooth push transitions with a whip-pan reveal at the midpoint.'",
  "captionOptions": [
    "Caption Option A — hook-driven, 125 chars max. Ends with CTA.",
    "Caption Option B — results-forward. Leads with a specific outcome or stat if available.",
    "Caption Option C — curiosity-gap. Opens a question the reel answers."
  ],
  "cta": "Exact CTA text for on-screen and caption. Specific. Not 'Learn More'.",
  "musicDirection": "Genre + tempo BPM range + mood + reference artist or track style. e.g. 'Cinematic indie-electronic, 90–110 BPM, understated urgency. Reference: Macroblank or similar textured lo-fi.'",
  "hashtagOptions": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "productionNotes": "Any strategic notes for the editor or KXD team — timing nuance, platform-specific considerations, or client review guidance."
}`;

  const userPrompt = [
    "=== BRAND CONTEXT ===",
    brandBlock,
    campaignBlock ? "\n=== CAMPAIGN CONTEXT ===" : "",
    campaignBlock,
    "\n=== REEL BRIEF ===",
    reelBriefBlock,
    "\n=== WEBSITE SCREENSHOT SECTIONS ===",
    screenshotsBlock,
    "\n=== STORYBOARD INSTRUCTIONS ===",
    outputSchema,
  ].filter(Boolean).join("\n");

  return {
    systemPrompt,
    userPrompt,
    fullPrompt: `${systemPrompt}\n\n${userPrompt}`,
  };
}

// ── Output parser ─────────────────────────────────────────────────────────────

export function parseReelStoryboardOutput(raw: string): ReelStoryboardOutput | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as Partial<ReelStoryboardOutput>;
    if (!parsed.reelTitle || !parsed.hook) return null;

    const scenes: ReelScene[] = Array.isArray(parsed.scenes)
      ? (parsed.scenes as Partial<ReelScene>[]).map((s, i) => ({
          number:        typeof s.number === "number" ? s.number : i + 1,
          title:         String(s.title ?? `Scene ${i + 1}`),
          timeIn:        String(s.timeIn ?? ""),
          timeOut:       String(s.timeOut ?? ""),
          duration:      String(s.duration ?? ""),
          screenshotRef: (s.screenshotRef as ReelScene["screenshotRef"]) ?? "hero",
          onScreenText:  String(s.onScreenText ?? ""),
          voiceover:     s.voiceover ?? null,
          visualNote:    String(s.visualNote ?? ""),
          transition:    String(s.transition ?? "Hard cut"),
          moodNote:      String(s.moodNote ?? ""),
        }))
      : [];

    return {
      reelTitle:       String(parsed.reelTitle),
      hook:            String(parsed.hook),
      scenes,
      totalDuration:   String(parsed.totalDuration ?? ""),
      transitionStyle: String(parsed.transitionStyle ?? ""),
      captionOptions:  Array.isArray(parsed.captionOptions) ? parsed.captionOptions.map(String) : [],
      cta:             String(parsed.cta ?? ""),
      musicDirection:  String(parsed.musicDirection ?? ""),
      hashtagOptions:  Array.isArray(parsed.hashtagOptions) ? parsed.hashtagOptions.map(String) : [],
      productionNotes: String(parsed.productionNotes ?? ""),
    };
  } catch {
    return null;
  }
}

// ── Text serialiser (for Payload textarea fields) ─────────────────────────────

export function reelStoryboardToText(out: ReelStoryboardOutput): string {
  const sceneLines = out.scenes.map(s =>
    [
      `── Scene ${s.number}: ${s.title} (${s.timeIn}–${s.timeOut}, ${s.duration}) ──`,
      `Screenshot: ${s.screenshotRef}`,
      `On-Screen Text: ${s.onScreenText}`,
      s.voiceover ? `Voiceover: ${s.voiceover}` : null,
      `Visual Note: ${s.visualNote}`,
      `Transition: ${s.transition}`,
      `Mood: ${s.moodNote}`,
    ].filter(Boolean).join("\n")
  ).join("\n\n");

  return [
    `REEL TITLE\n${out.reelTitle}`,
    `\nHOOK (0:00–0:03)\n${out.hook}`,
    `\nTOTAL DURATION\n${out.totalDuration}`,
    `\nTRANSITION STYLE\n${out.transitionStyle}`,
    `\nSCENE SEQUENCE\n${sceneLines}`,
    `\nCTA\n${out.cta}`,
    `\nMUSIC DIRECTION\n${out.musicDirection}`,
    out.captionOptions.length > 0
      ? `\nCAPTION OPTIONS\n${out.captionOptions.map((c, i) => `${["A", "B", "C"][i] || i + 1}. ${c}`).join("\n\n")}`
      : "",
    out.hashtagOptions.length > 0
      ? `\nHASHTAGS\n${out.hashtagOptions.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")}`
      : "",
    out.productionNotes ? `\nPRODUCTION NOTES\n${out.productionNotes}` : "",
  ].filter(Boolean).join("\n");
}

export function reelSceneSequenceToText(scenes: ReelScene[]): string {
  return scenes.map(s =>
    [
      `SCENE ${s.number} · ${s.title.toUpperCase()}`,
      `Time: ${s.timeIn}–${s.timeOut} (${s.duration})`,
      `Source: ${s.screenshotRef}`,
      `On-Screen: "${s.onScreenText}"`,
      s.voiceover ? `VO: "${s.voiceover}"` : null,
      `Visual: ${s.visualNote}`,
      `→ Transition: ${s.transition}`,
    ].filter(Boolean).join("\n")
  ).join("\n\n---\n\n");
}
