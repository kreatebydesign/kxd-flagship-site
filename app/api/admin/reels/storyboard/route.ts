/**
 * POST /api/admin/reels/storyboard
 * KXD Creative Engine — Phase 5A
 *
 * Brand-aware reel storyboard generator.
 *
 * Request body:
 *   { promoVideoRequestId: number }
 *
 * Flow:
 *   1. Load PromoVideoRequest (isWebsiteReel: true)
 *   2. Resolve brand context via creative-brand-resolver
 *   3. Assemble reel storyboard prompt (reel-storyboard-engine)
 *   4. Call OpenAI gpt-4o (or prompt-only if no API key)
 *   5. Parse structured storyboard output
 *   6. Save back to Payload — all Generated Content fields
 *   7. Return full result
 */

import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { resolveBrandContext } from "@/lib/creative-brand-resolver";
import {
  assembleReelStoryboardPrompt,
  parseReelStoryboardOutput,
  reelStoryboardToText,
  reelSceneSequenceToText,
  type ReelStoryboardOutput,
} from "@/lib/reel-storyboard-engine";

export const dynamic  = "force-dynamic";
export const maxDuration = 90;

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

// ── OpenAI call ───────────────────────────────────────────────────────────────

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const model = process.env.KXD_CREATIVE_MODEL || "gpt-4o";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature:     0.45,
      max_tokens:      2400,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   },
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
  const startMs = Date.now();

  try {
    const body = await req.json() as { promoVideoRequestId?: number };
    const requestId = body.promoVideoRequestId;

    if (!requestId || typeof requestId !== "number") {
      return NextResponse.json(
        { success: false, error: "promoVideoRequestId (number) is required." },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    // ── 1. Load request ─────────────────────────────────────────────────────

    let reelDoc: AnyDoc;
    try {
      reelDoc = await payload.findByID({
        collection: "promo-video-requests" as "clients",
        id: requestId,
        depth: 1,
      }) as AnyDoc;
    } catch {
      return NextResponse.json(
        { success: false, error: `Reel request ${requestId} not found.` },
        { status: 404 }
      );
    }

    const websiteUrl = str(reelDoc.websiteUrl);
    if (!websiteUrl) {
      return NextResponse.json(
        { success: false, error: "No website URL on this record." },
        { status: 422 }
      );
    }

    // ── 2. Mark as generating ───────────────────────────────────────────────

    await payload.update({
      collection: "promo-video-requests" as "clients",
      id: requestId,
      data: { storyboardGenerationStatus: "generating", status: "storyboarding" } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    // ── 3. Resolve brand context ────────────────────────────────────────────

    const clientId   = resolveId(reelDoc.client);
    const brandKitId = resolveId(reelDoc.brandKit);
    const campaignId = resolveId(reelDoc.relatedCampaign);

    if (!clientId) {
      await payload.update({
        collection: "promo-video-requests" as "clients",
        id: requestId,
        data: { storyboardGenerationStatus: "failed", storyboardGenerationError: "No client linked." } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });
      return NextResponse.json({ success: false, error: "No client linked to this reel request." }, { status: 422 });
    }

    const brand = await resolveBrandContext({ clientId, brandKitId, campaignId });

    // ── 4. Assemble prompt ──────────────────────────────────────────────────

    const capturedSections: string[] = Array.isArray(reelDoc.capturedScreenshots)
      ? ["hero", "services", "testimonials", "cta-footer", "full-brand"]
      : [];

    const promptInput = {
      brand,
      videoTitle:     String(reelDoc.videoTitle || ""),
      websiteUrl,
      clientName:     str(reelDoc.clientName) || brand.clientName,
      platform:       str(reelDoc.platform),
      visualStyle:    str(reelDoc.visualStyle),
      durationTarget: str(reelDoc.durationTarget),
      goal:           str(reelDoc.goal),
      audience:       str(reelDoc.audience),
      musicDirection: str(reelDoc.musicDirection),
      capturedSections,
    };

    const { systemPrompt, userPrompt, fullPrompt } = assembleReelStoryboardPrompt(promptInput);
    const hasApiKey = Boolean(process.env.OPENAI_API_KEY);

    // ── 5. Generate (or prompt-only mode) ───────────────────────────────────

    let output: ReelStoryboardOutput | null = null;
    let rawResponse = "";
    let generationError: string | null = null;

    if (hasApiKey) {
      try {
        rawResponse = await callOpenAI(systemPrompt, userPrompt);
        output = parseReelStoryboardOutput(rawResponse);
        if (!output) {
          generationError = "AI response could not be parsed. Raw output saved to script field.";
        }
      } catch (err) {
        generationError = `AI generation failed: ${String(err)}`;
        console.error("[KXD Reels] Storyboard generation error:", err);
      }
    } else {
      generationError = "OPENAI_API_KEY not set — prompt assembled but AI not called.";
    }

    // ── 6. Save to Payload ──────────────────────────────────────────────────

    const updateData: AnyDoc = {
      storyboardPrompt:          fullPrompt,
      storyboardGenerationStatus: generationError && !output ? "failed" : "complete",
      storyboardGeneratedAt:      new Date().toISOString(),
    };

    if (generationError) {
      updateData.storyboardGenerationError = generationError;
    }

    if (output) {
      const fullText = reelStoryboardToText(output);
      const sceneText = reelSceneSequenceToText(output.scenes);

      updateData.reelTitle          = output.reelTitle;
      updateData.reelHook           = output.hook;
      updateData.sceneSequence      = sceneText;
      updateData.transitionStyle    = output.transitionStyle;
      updateData.captionOptions     = output.captionOptions.join("\n\n---\n\n");
      updateData.ctaText            = output.cta;
      updateData.generatedScript    = fullText;
      updateData.generatedCaptions  = output.captionOptions.join("\n\n");
      updateData.musicDirection     = output.musicDirection;
      updateData.generatedPostCopy  = `HOOK: ${output.hook}\n\nCTA: ${output.cta}\n\nHASHTAGS: ${output.hashtagOptions.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")}`;
      updateData.status             = "storyboarding";
    } else if (rawResponse) {
      updateData.generatedScript = rawResponse;
    }

    await payload.update({
      collection: "promo-video-requests" as "clients",
      id: requestId,
      data: updateData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    const elapsedMs = Date.now() - startMs;

    return NextResponse.json({
      success:              true,
      promoVideoRequestId:  requestId,
      generationStatus:     updateData.storyboardGenerationStatus,
      hasApiKey,
      promptOnly:           !hasApiKey,
      promptLength:         fullPrompt.length,
      brandContext: {
        clientName:   brand.clientName,
        clientTier:   brand.clientTier,
        brandKitName: brand.brandKitName,
        warnings:     brand.warnings,
      },
      output:          output ?? null,
      generationError: generationError ?? null,
      elapsedMs,
    });

  } catch (err) {
    console.error("[KXD Reels] Storyboard route error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
