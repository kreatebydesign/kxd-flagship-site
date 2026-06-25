/**
 * POST /api/website-audit
 * Public Website Auditor — runs lean analysis and stores lead in KXD OS.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { getClientIp } from "@/lib/website-audit/client-ip";
import { findRecentDuplicateAudit } from "@/lib/website-audit/duplicate";
import {
  assertAuditRateLimit,
  AuditRateLimitError,
} from "@/lib/website-audit/rate-limit";
import { runWebsiteAudit } from "@/lib/website-audit/analyzer";
import {
  UnsafeAuditUrlError,
  validateSafePublicWebsiteUrl,
} from "@/lib/website-audit/url-safety";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name?: string;
      email?: string;
      company?: string;
      website?: string;
    };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const company = body.company?.trim() || "";
    const website = body.website?.trim();

    if (!name || !email || !website) {
      return NextResponse.json(
        { ok: false, message: "Name, email, and website URL are required." },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, message: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });
    const clientIp = getClientIp(req);

    try {
      await assertAuditRateLimit(payload, clientIp);
    } catch (err) {
      if (err instanceof AuditRateLimitError) {
        return NextResponse.json(
          { ok: false, message: err.message },
          { status: 429 },
        );
      }
      throw err;
    }

    let safeWebsiteUrl: string;
    try {
      safeWebsiteUrl = await validateSafePublicWebsiteUrl(website);
    } catch (err) {
      if (err instanceof UnsafeAuditUrlError) {
        return NextResponse.json(
          { ok: false, message: err.message },
          { status: 400 },
        );
      }
      throw err;
    }

    const existing = await findRecentDuplicateAudit(
      payload,
      email,
      safeWebsiteUrl,
    );
    if (existing) {
      return NextResponse.json({
        ok: true,
        id: existing.id,
        overallScore: existing.overallScore,
        grade: existing.grade,
      });
    }

    let audit;
    try {
      audit = await runWebsiteAudit(safeWebsiteUrl);
    } catch (err) {
      if (err instanceof UnsafeAuditUrlError) {
        return NextResponse.json(
          { ok: false, message: err.message },
          { status: 400 },
        );
      }
      console.error("[KXD Audit] Fetch/analyze failed:", err);
      return NextResponse.json(
        {
          ok: false,
          message:
            "We couldn't reach that website. Check the URL and try again, or contact KXD directly.",
        },
        { status: 422 },
      );
    }

    const completedAt = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await payload.create({
      collection: "website-audits" as any,
      data: {
        name,
        email,
        company,
        website: audit.websiteUrl,
        overallScore: audit.overallScore,
        grade: audit.grade,
        performanceScore: audit.performanceScore,
        seoScore: audit.seoScore,
        mobileScore: audit.mobileScore,
        conversionScore: audit.conversionScore,
        brandScore: audit.brandScore,
        strengths: audit.strengths.join("\n"),
        opportunities: audit.opportunities.join("\n"),
        recommendations: audit.recommendations.join("\n"),
        status: "new-lead",
        completedAt,
      } as any,
      overrideAccess: true,
    });

    return NextResponse.json({
      ok: true,
      id: record.id,
      overallScore: audit.overallScore,
      grade: audit.grade,
    });
  } catch (err) {
    console.error("[KXD Audit] Route error:", err);
    return NextResponse.json(
      { ok: false, message: "Audit failed. Please try again or contact KXD." },
      { status: 500 },
    );
  }
}
