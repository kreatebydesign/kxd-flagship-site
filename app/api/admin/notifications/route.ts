import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getNotificationCenter } from "@/lib/notifications";
import type { NotificationFilters, NotificationSeverity } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const SEVERITIES = new Set<NotificationSeverity>(["info", "warning", "critical", "success"]);

export async function GET(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const filters: NotificationFilters = {};

  const severity = searchParams.get("severity");
  if (severity && (severity === "all" || SEVERITIES.has(severity as NotificationSeverity))) {
    filters.severity = severity as NotificationFilters["severity"];
  }

  const module = searchParams.get("module");
  if (module) filters.module = module === "all" ? "all" : module;

  const clientId = searchParams.get("clientId");
  if (clientId) {
    filters.clientId = clientId === "all" ? "all" : Number(clientId);
  }

  const status = searchParams.get("status");
  if (status && ["all", "unread", "read", "resolved"].includes(status)) {
    filters.status = status as NotificationFilters["status"];
  }

  const data = await getNotificationCenter(filters);
  return NextResponse.json({ success: true, data } satisfies { success: boolean; data: typeof data });
}
