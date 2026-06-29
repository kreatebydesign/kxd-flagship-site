import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { publishClientActivity } from "@/lib/client-command/activity/publish";
import { loadClientWorkspaceBundle } from "@/lib/client-command/workspace-data";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { clientId?: number };
    const clientId = Number(body.clientId);

    if (!clientId) {
      return NextResponse.json({ success: false, error: "clientId required." }, { status: 400 });
    }

    const bundle = await loadClientWorkspaceBundle(clientId);
    if (!bundle) {
      return NextResponse.json({ success: false, error: "Client not found." }, { status: 404 });
    }

    const memory = bundle.memory;
    const payload = await getPayload({ config });
    const snapshotId = `memory-${clientId}-${Date.now()}`;

    const result = await publishClientActivity(
      {
        clientId,
        sourceModule: "Client Intelligence",
        sourceType: "client-memory",
        sourceId: snapshotId,
        eventType: "intelligence.snapshot",
        title: `Client intelligence snapshot · ${memory.clientName}`,
        summary: memory.executiveSummary.slice(0, 2).join(" "),
        details: `Health ${memory.scores.relationshipHealthScore}/100 · Urgency ${memory.scores.urgencyScore}/100 · ${memory.nextBestActions.length} recommended actions.`,
        timestamp: memory.generatedAt,
        metadata: {
          scores: memory.scores,
          currentStatus: memory.currentStatus,
        },
        relatedLinks: [
          {
            label: "Intelligence tab",
            href: `/admin/operations/client-command/${clientId}?tab=intelligence`,
          },
        ],
      },
      payload,
    );

    return NextResponse.json({
      success: true,
      created: result.created,
      skipped: result.skipped,
      eventId: result.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Snapshot failed.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
