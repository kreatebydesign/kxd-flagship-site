import { getPayload } from "payload";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getPartnershipPackage } from "@/lib/partnerships/packages";

type InquiryBody = {
  name?: string;
  email?: string;
  company?: string;
  website?: string;
  phone?: string;
  inquiryType?: string;
  budget?: string;
  timeline?: string;
  message?: string;
  referral?: string;
  source?: string;
  partnershipPackage?: string;
};

const DEPLOY_VERSION = "v4-partnership-package-2026-07-21";

const PARTNERSHIP_PACKAGE_VALUES = new Set([
  "partnership",
  "operating",
  "executive",
]);

export async function POST(request: Request) {
  console.log(`📬 POST /api/inquiries — handler invoked [${DEPLOY_VERSION}]`);

  try {
    const body = (await request.json()) as InquiryBody;
    console.log("📝 Inquiry body received:", {
      name: body.name,
      email: body.email,
      inquiryType: body.inquiryType,
      company: body.company,
      partnershipPackage: body.partnershipPackage,
      source: body.source,
    });

    if (!body.name?.trim() || !body.email?.trim() || !body.message?.trim()) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 },
      );
    }

    const partnershipPackage = PARTNERSHIP_PACKAGE_VALUES.has(
      String(body.partnershipPackage || ""),
    )
      ? (body.partnershipPackage as "partnership" | "operating" | "executive")
      : undefined;
    const partnershipLabel = partnershipPackage
      ? getPartnershipPackage(partnershipPackage)?.name
      : null;

    console.log("💾 Creating inquiry in Payload...");
    const payload = await getPayload({ config });

    const inquiry = await payload.create({
      collection: "inquiries",
      data: {
        name: body.name.trim(),
        email: body.email.trim(),
        company: body.company?.trim() || undefined,
        phone: body.phone?.trim() || undefined,
        website: body.website?.trim() || undefined,
        inquiryType:
          (body.inquiryType as
            | "luxury-website-experiences"
            | "brand-systems-identity"
            | "growth-infrastructure"
            | "enterprise-platforms"
            | "ongoing-partnership"
            | "general") || "general",
        budget: body.budget as
          | "under-5k"
          | "5k-10k"
          | "10k-25k"
          | "25k-50k"
          | "50k-plus"
          | undefined,
        timeline: body.timeline as
          | "immediate"
          | "within-30-days"
          | "60-90-days"
          | "exploring"
          | undefined,
        message: body.message.trim(),
        source: body.source || "project-application",
        partnershipPackage,
        status: "new",
      } as never,
    });

    console.log("✅ Inquiry saved to Payload. ID:", inquiry.id);

    // ── Send email notification via Resend ──────────────────────────────────
    // Email failures MUST NOT prevent the inquiry from saving.
    try {
      const apiKey = process.env.RESEND_API_KEY;

      if (!apiKey) {
        console.error("❌ RESEND_API_KEY is not set — skipping email notification");
      } else {
        const resend = new Resend(apiKey);

        const recipient =
          process.env.KXD_INQUIRY_EMAIL || "matt@kreatebydesign.com";

        const name = body.name?.trim() || "Unknown contact";
        const company = body.company?.trim() || "No company provided";
        const inquiryType = body.inquiryType || "General inquiry";
        const message = body.message?.trim() || "No message provided";
        const subject = `New KXD Inquiry · ${inquiryType} · ${company}`;

        const emailBody = [
          "New project application received via kreatebydesign.com.",
          "",
          `Name:          ${name}`,
          `Email:         ${body.email?.trim()}`,
          `Company:       ${company}`,
          `Website:       ${body.website?.trim() || "Not provided"}`,
          `Inquiry Type:  ${inquiryType}`,
          `Partnership:   ${partnershipLabel || "Not specified"}`,
          `Source:        ${body.source || "project-application"}`,
          `Investment:    ${body.budget || "Not specified"}`,
          `Timeline:      ${body.timeline || "Not specified"}`,
          `Referral:      ${body.referral || "Not specified"}`,
          "",
          "Project Goals:",
          message,
          "",
          `Payload ID: ${inquiry.id}`,
        ].join("\n");

        console.log("🚀 Sending inquiry email via Resend", {
          recipient,
          subject,
          inquiryId: inquiry.id,
        });

        const result = await resend.emails.send({
          from: "Kreate by Design <matt@kreatebydesign.com>",
          to: recipient,
          replyTo: body.email?.trim() ? [body.email.trim()] : undefined,
          subject,
          text: emailBody,
        });

        console.log("✅ Resend result:", JSON.stringify(result));
      }
    } catch (emailError) {
      console.error("❌ Resend email failed (inquiry still saved):", emailError);
    }
    // ────────────────────────────────────────────────────────────────────────

    return NextResponse.json({ success: true, id: inquiry.id });
  } catch (error) {
    console.error("❌ Inquiry submission failed:", error);
    return NextResponse.json(
      {
        error:
          "Unable to submit inquiry. Please email matt@kreatebydesign.com directly.",
      },
      { status: 500 },
    );
  }
}
