/**
 * lib/creative-prompt-engine.ts
 * KXD Creative Engine — Phase 4A
 *
 * Assembles brand-aware, KXD-quality creative prompts for:
 *   - Flyer generation
 *   - Social post generation
 *
 * Prompt design principles (KXD standard):
 *   — No generic AI phrasing ("Elevate your brand!", "Game-changing!")
 *   — No filler copy or placeholder language
 *   — Every output must reflect the client's actual voice, brand tier, and brief
 *   — Structured JSON output for reliable parsing
 *   — Separation of copy options, layout direction, and visual recommendations
 *   — CTA must be specific, not generic
 *
 * Returns:
 *   - systemPrompt: the AI system role definition
 *   - userPrompt: the assembled brief and output spec
 *   - outputSchema: the expected JSON structure (for validation)
 */

import { type BrandContext, tierToneGuidance } from "./creative-brand-resolver";

// ── Output types ──────────────────────────────────────────────────────────────

export interface FlyerGenerationOutput {
  headline:           string;
  subheadline:        string | null;
  bodyOptions:        string[];
  ctaLine:            string;
  layoutDirection:    string;
  visualDirection:    string;
  colorNotes:         string;
  typographyNotes:    string;
  assetRecommendations: string[];
  generatorNotes:     string;
}

export interface SocialPostGenerationOutput {
  captionFull:        string;
  captionShort:       string;
  hashtags:           string[];
  altText:            string;
  graphicDirection:   string;
  colorNotes:         string;
  assetRecommendations: string[];
  generatorNotes:     string;
}

export interface FlyerPromptInput {
  brand:          BrandContext;
  flyerTitle:     string;
  flyerType:      string | null;
  sizeFormat:     string | null;
  audience:       string | null;
  keyDetails:     string | null;
  offerOrMessage: string | null;
  cta:            string | null;
  requiredLogos:  string | null;
  requiredImages: string | null;
  canvaDirection: string | null;
  eventDate?:     string | null;
  deadline?:      string | null;
}

export interface SocialPromptInput {
  brand:          BrandContext;
  postTitle:      string;
  postType:       string | null;
  platform:       string | null;
  audience:       string | null;
  keyMessage:     string | null;
  cta:            string | null;
  imageDirection: string | null;
}

export interface AssembledPrompt {
  systemPrompt: string;
  userPrompt:   string;
  fullPrompt:   string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function section(label: string, value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return `${label}:\n${value.trim()}\n`;
}

function bulletList(label: string, items: string[]): string {
  if (items.length === 0) return "";
  return `${label}:\n${items.map(i => `- ${i}`).join("\n")}\n`;
}

function colorSpec(brand: BrandContext): string {
  const colors: string[] = [];
  if (brand.primaryColor)   colors.push(`Primary: ${brand.primaryColor}`);
  if (brand.secondaryColor) colors.push(`Secondary: ${brand.secondaryColor}`);
  if (brand.accentColor)    colors.push(`Accent: ${brand.accentColor}`);
  if (brand.neutralColor)   colors.push(`Neutral: ${brand.neutralColor}`);
  return colors.length > 0 ? colors.join(" · ") : "No palette specified — use sophisticated neutrals.";
}

function assetList(brand: BrandContext, context: "flyer" | "social"): string {
  const candidates: string[] = [];

  if (brand.logoAssets.length > 0) {
    const logos = brand.logoAssets.map(a => `${a.title}${a.externalUrl ? ` (${a.externalUrl})` : ""}`);
    candidates.push(...logos.map(l => `Logo: ${l}`));
  }

  if (context === "social" && brand.socialAssets.length > 0) {
    const templates = brand.socialAssets.map(a => `${a.title}${a.externalUrl ? ` (${a.externalUrl})` : ""}`);
    candidates.push(...templates.map(t => `Template: ${t}`));
  }

  if (brand.approvedAssets.length > 0) {
    const others = brand.approvedAssets
      .filter(a => a.assetType !== "logo" && !(context === "social" && a.assetType === "social-template"))
      .map(a => `${a.assetType}: ${a.title}${a.externalUrl ? ` (${a.externalUrl})` : ""}`);
    candidates.push(...others);
  }

  return candidates.length > 0 ? candidates.join("\n") : "No pre-approved assets on file.";
}

function platformSpecs(platform: string | null): string {
  const specs: Record<string, string> = {
    instagram: "1:1 square (1080×1080) or 4:5 portrait (1080×1350). Hook in first 125 chars. Hashtags after copy or first comment.",
    linkedin:  "Landscape (1200×628) preferred. Professional tone. No hashtag spam. Value-first copy.",
    facebook:  "Square or landscape. 40 char headline rule for ads. CTA button available.",
    email:     "600px wide. Subject line < 50 chars. Preheader < 90 chars. Single CTA.",
    website:   "Flexible. SEO-aware copy. Headline H1, supporting copy P. CTA button.",
  };
  return platform && specs[platform] ? specs[platform] : "Standard digital dimensions. Follow platform best practices.";
}

function flyerSizeSpec(sizeFormat: string | null): string {
  const specs: Record<string, string> = {
    square:    "1:1 ratio (1080×1080px digital / 5×5in print). Centered composition preferred.",
    story:     "9:16 ratio (1080×1920px). Vertical. CTA in lower third. Headline above fold.",
    portrait:  "4:5 ratio (1080×1350px) or A5. Strong vertical hierarchy.",
    landscape: "16:9 or 4:3 ratio. Horizontal rule. Two-column or hero + side-panel layouts.",
    letter:    "8.5×11in at 300dpi for print. Bleed + safe zone required. Full typography hierarchy.",
    poster:    "11×17in or 24×36in at 300dpi. Bold headline dominates. Single message.",
  };
  return sizeFormat && specs[sizeFormat] ? specs[sizeFormat] : "Flexible format — match the application context.";
}

// ── Flyer prompt assembler ────────────────────────────────────────────────────

export function assembleFlyerPrompt(input: FlyerPromptInput): AssembledPrompt {
  const { brand } = input;
  const toneGuidance = tierToneGuidance(brand.clientTier);

  const systemPrompt = `You are the KXD creative director. KXD is a premium design studio that produces luxury-grade creative work for high-value clients.

Your role: generate structured creative direction for a flyer — copy, layout, visual direction — that reflects the client's actual brand, not generic AI output.

KXD Standards:
- Every word must earn its place. Cut filler. Cut hype.
- Headlines must be specific, not aspirational vague ("Register Today" not "Transform Your Life").
- CTA must be actionable and direct.
- Design direction must reflect the brand tier and visual identity.
- Output must be in valid JSON matching the exact schema requested.
- Do not use: "game-changing", "unleash", "revolutionize", "elevate your brand", or similar marketing clichés.`;

  const brandBlock = [
    `BRAND: ${brand.brandKitName ?? brand.clientName}`,
    `CLIENT: ${brand.clientName}`,
    `TIER: ${brand.clientTier}`,
    `TONE: ${toneGuidance}`,
    section("VOICE & TONE", brand.voiceTone),
    section("BRAND PERSONALITY", brand.brandPersonality),
    section("POSITIONING", brand.positioningStatement),
    section("BRAND KEYWORDS", brand.brandKeywords),
    section("DO", brand.doRules),
    section("DON'T", brand.dontRules),
    section("COLORS", colorSpec(brand)),
    section("TYPOGRAPHY", brand.typographyDirection),
    section("CANVA DIRECTION", brand.canvaDirection ?? brand.logoNotes),
    section("PRIMARY CTA", brand.primaryCTA),
    section("AUDIENCE (BRAND)", brand.audience),
    section("TAGLINES ON FILE", brand.taglineOptions),
  ].filter(Boolean).join("\n");

  const campaignBlock = brand.campaignId ? [
    `CAMPAIGN: ${brand.campaignTitle ?? "Unnamed"}`,
    section("CAMPAIGN MESSAGE", brand.campaignMessage),
    section("CAMPAIGN GOAL", brand.campaignGoal),
    section("CAMPAIGN CTA", brand.campaignCTA),
  ].filter(Boolean).join("\n") : "";

  const requestBlock = [
    `FLYER: ${input.flyerTitle}`,
    section("TYPE", input.flyerType),
    section("FORMAT / SIZE", input.sizeFormat ? `${input.sizeFormat} — ${flyerSizeSpec(input.sizeFormat)}` : null),
    input.eventDate ? `EVENT DATE: ${input.eventDate}` : "",
    section("TARGET AUDIENCE", input.audience ?? brand.campaignAudience),
    section("KEY DETAILS (must appear on flyer)", input.keyDetails),
    section("OFFER / MESSAGE", input.offerOrMessage),
    section("CALL TO ACTION", input.cta ?? brand.primaryCTA),
    section("REQUIRED LOGOS (noted)", input.requiredLogos),
    section("REQUIRED IMAGES (noted)", input.requiredImages),
    section("ADDITIONAL CREATIVE DIRECTION", input.canvaDirection),
  ].filter(Boolean).join("\n");

  const assetsBlock = assetList(brand, "flyer");

  const outputSpec = `OUTPUT SCHEMA (return valid JSON only, no prose outside the JSON block):
{
  "headline": "Primary headline — specific, direct, brand-voice. Under 10 words.",
  "subheadline": "Supporting line or null — adds context, not repetition.",
  "bodyOptions": ["Option A — 1-2 sentences", "Option B — 1-2 sentences", "Option C — minimal variation"],
  "ctaLine": "Exact CTA text that appears on the flyer button/footer.",
  "layoutDirection": "Describe the recommended layout structure: hierarchy, zones, focal points, white space guidance.",
  "visualDirection": "Describe imagery style, mood, color application, background treatment, graphic elements.",
  "colorNotes": "How to apply the brand palette to this specific flyer format.",
  "typographyNotes": "Font weight/size guidance for headline, subheadline, body, CTA — based on brand typography direction.",
  "assetRecommendations": ["Asset or image recommendation 1", "Asset or image recommendation 2"],
  "generatorNotes": "Any strategic notes for the designer or client review."
}`;

  const userPrompt = [
    "=== BRAND CONTEXT ===",
    brandBlock,
    campaignBlock ? "\n=== CAMPAIGN CONTEXT ===" : "",
    campaignBlock,
    "\n=== FLYER BRIEF ===",
    requestBlock,
    "\n=== AVAILABLE ASSETS ===",
    assetsBlock,
    "\n=== INSTRUCTIONS ===",
    outputSpec,
  ].filter(Boolean).join("\n");

  return {
    systemPrompt,
    userPrompt,
    fullPrompt: `${systemPrompt}\n\n${userPrompt}`,
  };
}

// ── Social post prompt assembler ──────────────────────────────────────────────

export function assembleSocialPrompt(input: SocialPromptInput): AssembledPrompt {
  const { brand } = input;
  const toneGuidance = tierToneGuidance(brand.clientTier);

  const systemPrompt = `You are the KXD creative director. KXD is a premium design studio producing social content for high-value clients.

Your role: generate structured social post copy and graphic direction that reflects the client's actual brand — not generic social media templates.

KXD Standards:
- Copy must sound like the client, not a social media agency.
- No emojis unless the brand guide specifically calls for them.
- Hashtags must be intentional and audience-relevant — never hashtag stuffing.
- Caption structure: hook → value → CTA. Never reverse this.
- Graphic direction must be specific enough for a designer to execute without a call.
- Output must be valid JSON matching the exact schema. No prose outside the JSON.`;

  const brandBlock = [
    `BRAND: ${brand.brandKitName ?? brand.clientName}`,
    `CLIENT: ${brand.clientName}`,
    `TIER: ${brand.clientTier}`,
    `TONE: ${toneGuidance}`,
    section("VOICE & TONE", brand.voiceTone),
    section("BRAND PERSONALITY", brand.brandPersonality),
    section("POSITIONING", brand.positioningStatement),
    section("BRAND KEYWORDS", brand.brandKeywords),
    section("DO", brand.doRules),
    section("DON'T", brand.dontRules),
    section("COLORS", colorSpec(brand)),
    section("TYPOGRAPHY", brand.typographyDirection),
    section("PRIMARY CTA", brand.primaryCTA),
    section("AUDIENCE (BRAND)", brand.audience),
    section("SOCIAL BIO (context)", brand.socialBio),
    section("TAGLINES ON FILE", brand.taglineOptions),
  ].filter(Boolean).join("\n");

  const campaignBlock = brand.campaignId ? [
    `CAMPAIGN: ${brand.campaignTitle ?? "Unnamed"}`,
    section("CAMPAIGN MESSAGE", brand.campaignMessage),
    section("CAMPAIGN GOAL", brand.campaignGoal),
  ].filter(Boolean).join("\n") : "";

  const platformSpec = platformSpecs(input.platform);

  const requestBlock = [
    `POST: ${input.postTitle}`,
    section("TYPE", input.postType),
    section("PLATFORM", input.platform ? `${input.platform} — ${platformSpec}` : null),
    section("TARGET AUDIENCE", input.audience ?? brand.campaignAudience),
    section("KEY MESSAGE", input.keyMessage),
    section("CALL TO ACTION", input.cta ?? brand.primaryCTA),
    section("IMAGE DIRECTION", input.imageDirection),
  ].filter(Boolean).join("\n");

  const assetsBlock = assetList(brand, "social");

  const outputSpec = `OUTPUT SCHEMA (return valid JSON only, no prose outside the JSON block):
{
  "captionFull": "Full caption — hook + value + CTA. Platform-length appropriate. No filler sentences.",
  "captionShort": "Condensed caption under 125 characters for preview / story use.",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "altText": "Concise, descriptive alt text for the graphic — accessibility and SEO ready.",
  "graphicDirection": "Specific visual brief for a designer: composition, focal point, imagery, text overlay guidance, mood.",
  "colorNotes": "How brand colors apply to this post's graphic design.",
  "assetRecommendations": ["Asset or image recommendation 1", "Asset or image recommendation 2"],
  "generatorNotes": "Strategic notes for the client or designer — context, timing, or usage guidance."
}`;

  const userPrompt = [
    "=== BRAND CONTEXT ===",
    brandBlock,
    campaignBlock ? "\n=== CAMPAIGN CONTEXT ===" : "",
    campaignBlock,
    "\n=== POST BRIEF ===",
    requestBlock,
    "\n=== AVAILABLE ASSETS ===",
    assetsBlock,
    "\n=== INSTRUCTIONS ===",
    outputSpec,
  ].filter(Boolean).join("\n");

  return {
    systemPrompt,
    userPrompt,
    fullPrompt: `${systemPrompt}\n\n${userPrompt}`,
  };
}

// ── Prompt validation helpers ─────────────────────────────────────────────────

export function parseFlyerOutput(raw: string): FlyerGenerationOutput | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as Partial<FlyerGenerationOutput>;
    if (!parsed.headline) return null;
    return {
      headline:           String(parsed.headline),
      subheadline:        parsed.subheadline ?? null,
      bodyOptions:        Array.isArray(parsed.bodyOptions) ? parsed.bodyOptions.map(String) : [],
      ctaLine:            String(parsed.ctaLine ?? ""),
      layoutDirection:    String(parsed.layoutDirection ?? ""),
      visualDirection:    String(parsed.visualDirection ?? ""),
      colorNotes:         String(parsed.colorNotes ?? ""),
      typographyNotes:    String(parsed.typographyNotes ?? ""),
      assetRecommendations: Array.isArray(parsed.assetRecommendations) ? parsed.assetRecommendations.map(String) : [],
      generatorNotes:     String(parsed.generatorNotes ?? ""),
    };
  } catch {
    return null;
  }
}

export function parseSocialOutput(raw: string): SocialPostGenerationOutput | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as Partial<SocialPostGenerationOutput>;
    if (!parsed.captionFull) return null;
    return {
      captionFull:       String(parsed.captionFull),
      captionShort:      String(parsed.captionShort ?? ""),
      hashtags:          Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String) : [],
      altText:           String(parsed.altText ?? ""),
      graphicDirection:  String(parsed.graphicDirection ?? ""),
      colorNotes:        String(parsed.colorNotes ?? ""),
      assetRecommendations: Array.isArray(parsed.assetRecommendations) ? parsed.assetRecommendations.map(String) : [],
      generatorNotes:    String(parsed.generatorNotes ?? ""),
    };
  } catch {
    return null;
  }
}

// ── Structured text serialisers (for Payload textarea fields) ─────────────────

export function flyerOutputToText(out: FlyerGenerationOutput): string {
  return [
    `HEADLINE\n${out.headline}`,
    out.subheadline ? `SUBHEADLINE\n${out.subheadline}` : "",
    out.bodyOptions.length > 0 ? `BODY OPTIONS\n${out.bodyOptions.map((b, i) => `${i + 1}. ${b}`).join("\n")}` : "",
    `CTA\n${out.ctaLine}`,
    `\nLAYOUT DIRECTION\n${out.layoutDirection}`,
    `\nVISUAL DIRECTION\n${out.visualDirection}`,
    `\nCOLOR NOTES\n${out.colorNotes}`,
    `\nTYPOGRAPHY NOTES\n${out.typographyNotes}`,
    out.assetRecommendations.length > 0 ? `\nASSET RECOMMENDATIONS\n${out.assetRecommendations.map(a => `- ${a}`).join("\n")}` : "",
    out.generatorNotes ? `\nNOTES\n${out.generatorNotes}` : "",
  ].filter(Boolean).join("\n");
}

export function socialOutputToText(out: SocialPostGenerationOutput): string {
  return [
    `CAPTION (FULL)\n${out.captionFull}`,
    `\nCAPTION (SHORT)\n${out.captionShort}`,
    out.hashtags.length > 0 ? `\nHASHTAGS\n${out.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")}` : "",
    out.altText ? `\nALT TEXT\n${out.altText}` : "",
    `\nGRAPHIC DIRECTION\n${out.graphicDirection}`,
    `\nCOLOR NOTES\n${out.colorNotes}`,
    out.assetRecommendations.length > 0 ? `\nASSET RECOMMENDATIONS\n${out.assetRecommendations.map(a => `- ${a}`).join("\n")}` : "",
    out.generatorNotes ? `\nNOTES\n${out.generatorNotes}` : "",
  ].filter(Boolean).join("\n");
}
