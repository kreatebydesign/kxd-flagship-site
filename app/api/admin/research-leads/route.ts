/**
 * /api/admin/research-leads
 * POST — create research lead
 * PATCH — status / grade / qualification evidence / reject reason
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  RESEARCH_GRADES,
  RESEARCH_REJECT_REASONS,
  RESEARCH_RESEARCHERS,
  RESEARCH_STATUSES,
  normalizeResearchIntake,
  type ResearchGrade,
  type ResearchRejectReason,
  type ResearchStatus,
} from "@/lib/research-leads";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set(RESEARCH_STATUSES.map((s) => s.value));
const VALID_RESEARCHERS = new Set(RESEARCH_RESEARCHERS.map((r) => r.value));
const VALID_GRADES = new Set(RESEARCH_GRADES.map((g) => g.value));
const VALID_REJECT_REASONS = new Set(RESEARCH_REJECT_REASONS.map((r) => r.value));

function parseOptionalGrade(value: unknown): ResearchGrade | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "string" && VALID_GRADES.has(value as ResearchGrade)) {
    return value as ResearchGrade;
  }
  return undefined;
}

function parseOptionalRejectReason(value: unknown): ResearchRejectReason | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "string" && VALID_REJECT_REASONS.has(value as ResearchRejectReason)) {
    return value as ResearchRejectReason;
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();

    if (
      !body.researcherName?.trim() ||
      !VALID_RESEARCHERS.has(body.researcherName.trim() as (typeof RESEARCH_RESEARCHERS)[number]["value"])
    ) {
      return NextResponse.json({ success: false, error: "Select a valid researcher." }, { status: 400 });
    }

    const normalized = normalizeResearchIntake({
      opportunityUrl: body.opportunityUrl,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      leadUrl: body.leadUrl,
      businessName: body.businessName,
      city: body.city,
      state: body.state,
      estimatedService: body.estimatedService,
      notes: body.notes,
      source: body.source,
    });

    if (!normalized.ok) {
      return NextResponse.json({ success: false, error: normalized.message }, { status: 400 });
    }

    const payload = await getPayload({ config });
    const d = normalized.data;

    const data: Record<string, unknown> = {
      researcherName: body.researcherName.trim(),
      source: d.source,
      status: "new",
    };

    if (d.state) data.state = d.state;
    if (d.city) data.city = d.city;
    if (d.businessName) data.businessName = d.businessName;
    if (d.opportunityUrl) data.opportunityUrl = d.opportunityUrl;
    if (d.contactEmail) data.contactEmail = d.contactEmail;
    if (d.contactPhone) data.contactPhone = d.contactPhone;
    if (d.leadUrl) data.leadUrl = d.leadUrl;
    if (d.estimatedService) data.estimatedService = d.estimatedService;
    if (d.notes) data.notes = d.notes;

    const record = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "research-leads" as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
    });

    return NextResponse.json({ success: true, id: record.id });
  } catch (err) {
    console.error("[KXD] Failed to create research lead:", err);
    return NextResponse.json(
      { success: false, error: "Failed to submit lead. Check server logs." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const id = Number(body.id);

    if (!id || !Number.isFinite(id)) {
      return NextResponse.json({ success: false, error: "Valid id required." }, { status: 400 });
    }

    const hasStatus = body.status !== undefined;
    const hasGrade = Object.prototype.hasOwnProperty.call(body, "grade");
    const hasEvidence = Object.prototype.hasOwnProperty.call(body, "qualificationEvidence");
    const hasRejectReason = Object.prototype.hasOwnProperty.call(body, "rejectReason");

    if (!hasStatus && !hasGrade && !hasEvidence && !hasRejectReason) {
      return NextResponse.json(
        {
          success: false,
          error: "Provide status, grade, qualificationEvidence, and/or rejectReason.",
        },
        { status: 400 },
      );
    }

    const data: Record<string, unknown> = {};

    if (hasStatus) {
      const status = body.status;
      if (!status || !VALID_STATUSES.has(status as ResearchStatus)) {
        return NextResponse.json({ success: false, error: "Valid status required." }, { status: 400 });
      }
      data.status = status;

      if (status === "rejected") {
        const reason = parseOptionalRejectReason(body.rejectReason);
        if (!reason) {
          return NextResponse.json(
            { success: false, error: "Select a reject reason when rejecting a lead." },
            { status: 400 },
          );
        }
        data.rejectReason = reason;
      }
    }

    if (hasGrade) {
      const grade = parseOptionalGrade(body.grade);
      if (grade === undefined) {
        return NextResponse.json({ success: false, error: "Valid grade required." }, { status: 400 });
      }
      data.grade = grade;
    }

    if (hasEvidence) {
      if (typeof body.qualificationEvidence !== "string" && body.qualificationEvidence !== null) {
        return NextResponse.json(
          { success: false, error: "qualificationEvidence must be text." },
          { status: 400 },
        );
      }
      data.qualificationEvidence =
        typeof body.qualificationEvidence === "string"
          ? body.qualificationEvidence.trim() || null
          : null;
    }

    if (hasRejectReason && !(hasStatus && body.status === "rejected")) {
      const reason = parseOptionalRejectReason(body.rejectReason);
      if (reason === undefined) {
        return NextResponse.json(
          { success: false, error: "Valid reject reason required." },
          { status: 400 },
        );
      }
      data.rejectReason = reason;
    }

    const payload = await getPayload({ config });

    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "research-leads" as any,
      id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[KXD] Failed to update research lead:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update research lead." },
      { status: 500 },
    );
  }
}
