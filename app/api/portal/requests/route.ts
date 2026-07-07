/**
 * POST /api/portal/requests
 * Client-submitted request — scoped to authenticated portal user's client.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { getPortalSession } from "@/lib/portal/session";
import { spawnWorkItemFromPortalRequest } from "@/lib/work-items/spawn";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      requestTitle?: string;
      requestType?: string;
      requestDetails?: string;
      relatedProject?: number;
    };

    const requestTitle = body.requestTitle?.trim();
    if (!requestTitle) {
      return NextResponse.json(
        { ok: false, message: "Request title is required." },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });

    const data: Record<string, unknown> = {
      requestTitle,
      client: session.clientId,
      status: "new",
      priority: "normal",
      requestedBy: session.displayName,
      requestedByEmail: session.email,
    };

    if (body.requestType?.trim()) data.requestType = body.requestType.trim();
    if (body.requestDetails?.trim()) data.requestDetails = body.requestDetails.trim();
    if (body.relatedProject && Number.isFinite(body.relatedProject)) {
      // Verify project belongs to this client
      const project = await payload.findByID({
        collection: "client-projects",
        id: body.relatedProject,
        depth: 0,
        overrideAccess: true,
      });
      const projectClient =
        typeof project.client === "number"
          ? project.client
          : (project.client as { id?: number })?.id;
      if (projectClient !== session.clientId) {
        return NextResponse.json(
          { ok: false, message: "Invalid project selection." },
          { status: 400 },
        );
      }
      data.relatedProject = body.relatedProject;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await payload.create({
      collection: "client-requests" as any,
      data: data as any,
      overrideAccess: true,
    });

    const requestId = record.id as number;
    const relatedProjectId =
      typeof data.relatedProject === "number" ? data.relatedProject : null;

    await spawnWorkItemFromPortalRequest({
      clientId: session.clientId,
      requestId,
      requestTitle,
      requestType: body.requestType?.trim() ?? null,
      requestDetails: body.requestDetails?.trim() ?? null,
      relatedProjectId,
    });

    return NextResponse.json({ ok: true, id: requestId });
  } catch (err) {
    console.error("[KXD Portal] Create request failed:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to submit request. Please try again." },
      { status: 500 },
    );
  }
}
