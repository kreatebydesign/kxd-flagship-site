import { getPayload } from "payload";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { routeInquiryNotification } from "@/lib/inquiries/route-notification";

type InquiryBody = {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  inquiryType?: string;
  budget?: string;
  timeline?: string;
  message?: string;
  source?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InquiryBody;

    if (!body.name?.trim() || !body.email?.trim() || !body.message?.trim()) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });

    const inquiry = await payload.create({
      collection: "inquiries",
      data: {
        name: body.name.trim(),
        email: body.email.trim(),
        company: body.company?.trim() || undefined,
        phone: body.phone?.trim() || undefined,
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
        source: body.source || "contact-page",
        status: "new",
      },
    });

    try {
      await routeInquiryNotification(inquiry, payload);
    } catch (notificationError) {
      payload.logger.error({
        msg: "Inquiry saved but notification email failed",
        err: notificationError,
        inquiryId: inquiry.id,
      });
    }

    return NextResponse.json({ success: true, id: inquiry.id });
  } catch (error) {
    console.error("Inquiry submission failed:", error);
    return NextResponse.json(
      { error: "Unable to submit inquiry. Please email matt@kreatebydesign.com directly." },
      { status: 500 },
    );
  }
}