import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEPLOY_VERSION = "v1-project-inquiries-2026-06-09";

export async function POST(request: Request) {
  console.log(`📋 POST /api/project-inquiries — handler invoked [${DEPLOY_VERSION}]`);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    companyName,
    websiteUrl,
    contactName,
    email,
    phone,
    servicesInterested,
    businessGoals,
    investmentRange,
    timeline,
    assetsAvailable,
    notes,
  } = body;

  if (!companyName || !contactName || !email) {
    return NextResponse.json(
      { error: "companyName, contactName, and email are required" },
      { status: 422 },
    );
  }

  // ── Save to Payload ───────────────────────────────────────────────────────
  let inquiry: { id: number | string } | null = null;
  try {
    console.log("💾 Creating project inquiry in Payload...");
    const payload = await getPayload({ config });
    inquiry = await (payload as unknown as { create: (args: { collection: string; data: unknown }) => Promise<{ id: number | string }> }).create({
      collection: "project-inquiries",
      data: {
        companyName: String(companyName),
        websiteUrl: websiteUrl ? String(websiteUrl) : undefined,
        contactName: String(contactName),
        email: String(email),
        phone: phone ? String(phone) : undefined,
        servicesInterested: Array.isArray(servicesInterested)
          ? (servicesInterested as string[]).join(", ")
          : servicesInterested
            ? String(servicesInterested)
            : undefined,
        businessGoals: businessGoals ? String(businessGoals) : undefined,
        investmentRange: investmentRange ? String(investmentRange) : undefined,
        timeline: timeline ? String(timeline) : undefined,
        assetsAvailable: Array.isArray(assetsAvailable)
          ? (assetsAvailable as string[]).join(", ")
          : assetsAvailable
            ? String(assetsAvailable)
            : undefined,
        notes: notes ? String(notes) : undefined,
        status: "new",
        submittedAt: new Date().toISOString(),
      },
    });
    console.log(`✅ Project inquiry saved — ID: ${inquiry.id}`);
  } catch (err) {
    console.error("❌ Payload create failed:", err);
    return NextResponse.json({ error: "Failed to save inquiry" }, { status: 500 });
  }

  // ── Send email notification ───────────────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const to = process.env.KXD_INQUIRY_EMAIL ?? "matt@kreatebydesign.com";

      console.log(`🚀 Sending project inquiry email to ${to}`);

      const services = Array.isArray(servicesInterested)
        ? (servicesInterested as string[]).join(", ")
        : String(servicesInterested ?? "—");

      const assets = Array.isArray(assetsAvailable)
        ? (assetsAvailable as string[]).join(", ")
        : String(assetsAvailable ?? "—");

      const result = await resend.emails.send({
        from: "Kreate by Design <matt@kreatebydesign.com>",
        to,
        replyTo: String(email),
        subject: `New Project Application — ${String(companyName)} (${String(contactName)})`,
        html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0a0a0a;color:#e8ded0;">
  <div style="border-bottom:1px solid rgba(197,166,92,0.3);padding-bottom:24px;margin-bottom:28px;">
    <p style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#C5A65C;margin:0 0 8px;">KXD Project Application</p>
    <h1 style="font-size:22px;font-weight:300;color:#f8f3ea;margin:0;">${String(companyName)}</h1>
    <p style="font-size:13px;color:#bfb7aa;margin:4px 0 0;">${String(contactName)} &bull; ${String(email)}</p>
  </div>

  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    ${websiteUrl ? `<tr><td style="padding:8px 0;color:#bfb7aa;width:160px;">Website</td><td style="padding:8px 0;color:#e8ded0;">${String(websiteUrl)}</td></tr>` : ""}
    ${phone ? `<tr><td style="padding:8px 0;color:#bfb7aa;">Phone</td><td style="padding:8px 0;color:#e8ded0;">${String(phone)}</td></tr>` : ""}
    <tr><td style="padding:8px 0;color:#bfb7aa;">Services</td><td style="padding:8px 0;color:#e8ded0;">${services}</td></tr>
    ${investmentRange ? `<tr><td style="padding:8px 0;color:#bfb7aa;">Investment</td><td style="padding:8px 0;color:#e8ded0;">${String(investmentRange)}</td></tr>` : ""}
    ${timeline ? `<tr><td style="padding:8px 0;color:#bfb7aa;">Timeline</td><td style="padding:8px 0;color:#e8ded0;">${String(timeline)}</td></tr>` : ""}
    ${assetsAvailable ? `<tr><td style="padding:8px 0;color:#bfb7aa;">Assets</td><td style="padding:8px 0;color:#e8ded0;">${assets}</td></tr>` : ""}
  </table>

  ${businessGoals ? `
  <div style="margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.07);">
    <p style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#bfb7aa;margin:0 0 10px;">Business Goals</p>
    <p style="font-size:14px;line-height:1.7;color:#e8ded0;margin:0;">${String(businessGoals).replace(/\n/g, "<br>")}</p>
  </div>` : ""}

  ${notes ? `
  <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.07);">
    <p style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#bfb7aa;margin:0 0 10px;">Additional Notes</p>
    <p style="font-size:14px;line-height:1.7;color:#e8ded0;margin:0;">${String(notes).replace(/\n/g, "<br>")}</p>
  </div>` : ""}

  <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(197,166,92,0.2);font-size:11px;color:rgba(191,183,170,0.4);">
    Submitted via /start-project &bull; Payload ID: ${inquiry?.id ?? "—"}
  </div>
</div>`,
      });
      console.log("✅ Resend result:", result);
    } catch (emailErr) {
      console.error("❌ Resend failed (inquiry already saved):", emailErr);
    }
  } else {
    console.log("⚠️ RESEND_API_KEY not set — email notification skipped");
  }

  return NextResponse.json({ success: true, id: inquiry?.id });
}
