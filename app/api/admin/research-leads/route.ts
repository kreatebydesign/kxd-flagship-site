/**
 * /api/admin/research-leads
 * POST — create research lead
 * PATCH — status / grade / qualification / reject / Opportunity Intelligence fields
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  RESEARCH_COMMERCIAL_BANDS,
  RESEARCH_GRADES,
  RESEARCH_RECOMMENDED_CHANNELS,
  RESEARCH_REJECT_REASONS,
  RESEARCH_RESEARCHERS,
  RESEARCH_STATUSES,
  RESEARCH_TRIGGER_TYPES,
  RESEARCH_URGENCIES,
  normalizeResearchIntake,
  type ResearchCommercialBand,
  type ResearchGrade,
  type ResearchRecommendedChannel,
  type ResearchRejectReason,
  type ResearchStatus,
  type ResearchTriggerType,
  type ResearchUrgency,
} from "@/lib/research-leads";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set(RESEARCH_STATUSES.map((s) => s.value));
const VALID_RESEARCHERS = new Set(RESEARCH_RESEARCHERS.map((r) => r.value));
const VALID_GRADES = new Set(RESEARCH_GRADES.map((g) => g.value));
const VALID_REJECT_REASONS = new Set(RESEARCH_REJECT_REASONS.map((r) => r.value));
const VALID_TRIGGER_TYPES = new Set(RESEARCH_TRIGGER_TYPES.map((t) => t.value));
const VALID_CHANNELS = new Set(RESEARCH_RECOMMENDED_CHANNELS.map((c) => c.value));
const VALID_URGENCIES = new Set(RESEARCH_URGENCIES.map((u) => u.value));
const VALID_BANDS = new Set(RESEARCH_COMMERCIAL_BANDS.map((b) => b.value));

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

function parseOptionalSelect<T extends string>(
  value: unknown,
  valid: Set<string>,
): T | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "string" && valid.has(value)) return value as T;
  return undefined;
}

function parseOptionalEventDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Accept YYYY-MM-DD from day-only inputs
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T12:00:00.000Z`;
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function parseOptionalDigitalGap(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  return value.trim() || null;
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

    const triggerType = parseOptionalSelect<ResearchTriggerType>(
      body.triggerType,
      VALID_TRIGGER_TYPES,
    );
    const eventDate = parseOptionalEventDate(body.eventDate);
    const digitalGap = parseOptionalDigitalGap(body.digitalGap);
    const recommendedChannel = parseOptionalSelect<ResearchRecommendedChannel>(
      body.recommendedChannel,
      VALID_CHANNELS,
    );
    const urgency = parseOptionalSelect<ResearchUrgency>(body.urgency, VALID_URGENCIES);
    const commercialBand = parseOptionalSelect<ResearchCommercialBand>(
      body.commercialBand,
      VALID_BANDS,
    );

    if (
      (body.triggerType !== undefined &&
        body.triggerType !== null &&
        body.triggerType !== "" &&
        triggerType === undefined) ||
      (body.eventDate !== undefined &&
        body.eventDate !== null &&
        body.eventDate !== "" &&
        eventDate === undefined) ||
      (body.digitalGap !== undefined && digitalGap === undefined) ||
      (body.recommendedChannel !== undefined &&
        body.recommendedChannel !== null &&
        body.recommendedChannel !== "" &&
        recommendedChannel === undefined) ||
      (body.urgency !== undefined &&
        body.urgency !== null &&
        body.urgency !== "" &&
        urgency === undefined) ||
      (body.commercialBand !== undefined &&
        body.commercialBand !== null &&
        body.commercialBand !== "" &&
        commercialBand === undefined)
    ) {
      return NextResponse.json(
        { success: false, error: "One or more Opportunity Intelligence fields are invalid." },
        { status: 400 },
      );
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
    if (triggerType) data.triggerType = triggerType;
    if (eventDate) data.eventDate = eventDate;
    if (digitalGap) data.digitalGap = digitalGap;
    if (recommendedChannel) data.recommendedChannel = recommendedChannel;
    if (urgency) data.urgency = urgency;
    if (commercialBand) data.commercialBand = commercialBand;

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
    const hasTriggerType = Object.prototype.hasOwnProperty.call(body, "triggerType");
    const hasEventDate = Object.prototype.hasOwnProperty.call(body, "eventDate");
    const hasDigitalGap = Object.prototype.hasOwnProperty.call(body, "digitalGap");
    const hasChannel = Object.prototype.hasOwnProperty.call(body, "recommendedChannel");
    const hasUrgency = Object.prototype.hasOwnProperty.call(body, "urgency");
    const hasBand = Object.prototype.hasOwnProperty.call(body, "commercialBand");

    if (
      !hasStatus &&
      !hasGrade &&
      !hasEvidence &&
      !hasRejectReason &&
      !hasTriggerType &&
      !hasEventDate &&
      !hasDigitalGap &&
      !hasChannel &&
      !hasUrgency &&
      !hasBand
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Provide status, grade, qualificationEvidence, rejectReason, and/or Opportunity Intelligence fields.",
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

    if (hasTriggerType) {
      const triggerType = parseOptionalSelect<ResearchTriggerType>(
        body.triggerType,
        VALID_TRIGGER_TYPES,
      );
      if (triggerType === undefined) {
        return NextResponse.json({ success: false, error: "Valid trigger type required." }, { status: 400 });
      }
      data.triggerType = triggerType;
    }

    if (hasEventDate) {
      const eventDate = parseOptionalEventDate(body.eventDate);
      if (eventDate === undefined) {
        return NextResponse.json({ success: false, error: "Valid event date required." }, { status: 400 });
      }
      data.eventDate = eventDate;
    }

    if (hasDigitalGap) {
      const digitalGap = parseOptionalDigitalGap(body.digitalGap);
      if (digitalGap === undefined) {
        return NextResponse.json({ success: false, error: "digitalGap must be text." }, { status: 400 });
      }
      data.digitalGap = digitalGap;
    }

    if (hasChannel) {
      const recommendedChannel = parseOptionalSelect<ResearchRecommendedChannel>(
        body.recommendedChannel,
        VALID_CHANNELS,
      );
      if (recommendedChannel === undefined) {
        return NextResponse.json(
          { success: false, error: "Valid recommended channel required." },
          { status: 400 },
        );
      }
      data.recommendedChannel = recommendedChannel;
    }

    if (hasUrgency) {
      const urgency = parseOptionalSelect<ResearchUrgency>(body.urgency, VALID_URGENCIES);
      if (urgency === undefined) {
        return NextResponse.json({ success: false, error: "Valid urgency required." }, { status: 400 });
      }
      data.urgency = urgency;
    }

    if (hasBand) {
      const commercialBand = parseOptionalSelect<ResearchCommercialBand>(
        body.commercialBand,
        VALID_BANDS,
      );
      if (commercialBand === undefined) {
        return NextResponse.json(
          { success: false, error: "Valid commercial band required." },
          { status: 400 },
        );
      }
      data.commercialBand = commercialBand;
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
