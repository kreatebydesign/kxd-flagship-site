/**
 * POST /api/admin/creative/social/generate
 * KXD Creative Engine — Phase 4A
 *
 * Brand-aware social post copy and graphic direction generator.
 *
 * Request body:
 *   { socialPostRequestId: number }
 *
 * Flow:
 *   1. Load social post request from Payload
 *   2. Resolve brand context (client → brand kit → campaign → assets)
 *   3. Assemble premium KXD-standard prompt
 *   4. Call OpenAI (if OPENAI_API_KEY is set) or return prompt-only output
 *   5. Parse and validate structured output
 *   6. Save back to Payload: generated fields + generationStatus + generatedAt
 *   7. Return result
 *
 * Prompt-only mode:
 *   Returns the assembled prompt without an API key. Use for pipeline testing.
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getPayload } from "payload";
import config from "@payload-config";
import { resolveBrandContext } from "@/lib/creative-brand-resolver";
import {
  assembleSocialPrompt,
  parseSocialOutput,
  socialOutputToText,
  type SocialPostGenerationOutput,
} from "@/lib/creative-prompt-engine";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function resolveId(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "object" && raw !== null && "id" in raw) return (raw as AnyDoc).id as number;
  if (typeof raw === "number") return raw;
  return null;
}

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

// ── LLM call (OpenAI) ─────────────────────────────────────────────────────────

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const model = process.env.KXD_CREATIVE_MODEL || "gpt-4o";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 900,
      messages: [
        { role: "system",  content: systemPrompt },
        { role: "user",    content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const json = await res.json() as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content ?? "";
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const startMs = Date.now();

  try {
    const body = await req.json() as { socialPostRequestId?: number };
    const socialPostRequestId = body.socialPostRequestId;

    if (!socialPostRequestId || typeof socialPostRequestId !== "number") {
      return NextResponse.json({ success: false, error: "socialPostRequestId (number) is required." }, { status: 400 });
    }

    const payload = await getPayload({ config });

    // ── 1. Load social post request ─────────────────────────────────────────

    let postDoc: AnyDoc;
    try {
      postDoc = await payload.findByID({
        collection: "social-post-requests" as "clients",
        id: socialPostRequestId,
        depth: 1,
      }) as AnyDoc;
    } catch {
      return NextResponse.json({ success: false, error: `Social post request ${socialPostRequestId} not found.` }, { status: 404 });
    }

    // ── 2. Mark as generating ───────────────────────────────────────────────

    await payload.update({
      collection: "social-post-requests" as "clients",
      id: socialPostRequestId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { generationStatus: "generating" } as any,
    });

    // ── 3. Resolve brand context ────────────────────────────────────────────

    const clientId   = resolveId(postDoc.client);
    const brandKitId = resolveId(postDoc.brandKit);
    const campaignId = resolveId(postDoc.relatedCampaign);

    if (!clientId) {
      await payload.update({
        collection: "social-post-requests" as "clients",
        id: socialPostRequestId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { generationStatus: "failed", generationError: "No client linked to this social post request." } as any,
      });
      return NextResponse.json({ success: false, error: "No client linked to this social post request." }, { status: 422 });
    }

    const brand = await resolveBrandContext({ clientId, brandKitId, campaignId });

    // ── 4. Assemble prompt ──────────────────────────────────────────────────

    const promptInput = {
      brand,
      postTitle:      String(postDoc.postTitle || ""),
      postType:       str(postDoc.postType),
      platform:       str(postDoc.platform),
      audience:       str(postDoc.audience),
      keyMessage:     str(postDoc.keyMessage),
      cta:            str(postDoc.cta),
      imageDirection: str(postDoc.imageDirection),
    };

    const { systemPrompt, userPrompt, fullPrompt } = assembleSocialPrompt(promptInput);

    const hasApiKey = Boolean(process.env.OPENAI_API_KEY);

    // ── 5. Generate (or prompt-only mode) ──────────────────────────────────

    let output: SocialPostGenerationOutput | null = null;
    let generatedText = "";
    let generationError: string | null = null;

    if (hasApiKey) {
      try {
        const rawResponse = await callOpenAI(systemPrompt, userPrompt);
        output = parseSocialOutput(rawResponse);
        if (!output) {
          generatedText = rawResponse;
          generationError = "AI response could not be parsed. Raw output saved to Graphic Direction field.";
        } else {
          generatedText = socialOutputToText(output);
        }
      } catch (err) {
        generationError = `AI generation failed: ${String(err)}`;
        console.error("[KXD Creative] Social post generation error:", err);
      }
    } else {
      generationError = "OPENAI_API_KEY not set — prompt assembled but AI not called. Set the key to enable generation.";
    }

    // ── 6. Save results to Payload ─────────────────────────────────────────

    const updateData: AnyDoc = {
      generationPrompt:  fullPrompt,
      generationStatus:  generationError && !output ? "failed" : "complete",
      generatedAt:       new Date().toISOString(),
    };

    if (generationError) {
      updateData.generationError = generationError;
    }

    if (output) {
      updateData.generatedCaption      = output.captionFull;
      updateData.generatedShortCaption = output.captionShort;
      updateData.generatedHashtags     = output.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ");
      updateData.generatedAltText      = output.altText;
      updateData.generatedGraphicDirection = generatedText;
    } else if (generatedText && !output) {
      updateData.generatedGraphicDirection = generatedText;
    }

    await payload.update({
      collection: "social-post-requests" as "clients",
      id: socialPostRequestId,
      data: updateData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    const elapsedMs = Date.now() - startMs;

    return NextResponse.json({
      success:  true,
      socialPostRequestId,
      generationStatus: updateData.generationStatus,
      hasApiKey,
      promptOnly: !hasApiKey,
      promptLength: fullPrompt.length,
      brandContext: {
        clientName:   brand.clientName,
        clientTier:   brand.clientTier,
        brandKitName: brand.brandKitName,
        warnings:     brand.warnings,
      },
      output: output ?? null,
      generationError: generationError ?? null,
      elapsedMs,
    });

  } catch (err) {
    console.error("[KXD Creative] Social generate route error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
