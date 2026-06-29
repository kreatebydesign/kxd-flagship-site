import { NextResponse } from "next/server";
import { performQuickClientAction } from "@/lib/client-command/actions/quick";
import type { QuickActionOperation } from "@/lib/client-command/actions/quick";
import type {
  ClientActionPriority,
  ClientActionSource,
  ClientActionType,
} from "@/lib/client-command/actions/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      clientId: number;
      operation: QuickActionOperation;
      actionId?: number;
      memoryReference?: string;
      title?: string;
      description?: string;
      source?: ClientActionSource;
      priority?: ClientActionPriority;
      actionType?: ClientActionType;
      assignedTo?: string;
    };

    if (!body.clientId || !body.operation) {
      return NextResponse.json(
        { success: false, error: "clientId and operation are required." },
        { status: 400 },
      );
    }

    const doc = await performQuickClientAction({
      clientId: body.clientId,
      operation: body.operation,
      actionId: body.actionId,
      memoryReference: body.memoryReference,
      title: body.title,
      description: body.description,
      source: body.source,
      priority: body.priority,
      actionType: body.actionType,
      assignedTo: body.assignedTo,
    });

    return NextResponse.json({
      success: true,
      id: doc.id,
      href: `/admin/collections/client-actions/${doc.id}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Quick action failed.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
