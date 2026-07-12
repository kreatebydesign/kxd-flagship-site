import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { getExecutiveActivityCenter } from "@/lib/activity-engine";
import type { ExecutiveActivityFilters, ExecutiveActivityImportance } from "@/lib/activity-engine";

export const dynamic = "force-dynamic";

const IMPORTANCE = new Set<ExecutiveActivityImportance>([
  "low",
  "normal",
  "high",
  "critical",
]);

export async function GET(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const filters: ExecutiveActivityFilters = {};

  const clientId = searchParams.get("clientId");
  if (clientId && clientId !== "all") {
    const n = Number(clientId);
    if (Number.isFinite(n)) filters.clientId = n;
  }

  const importance = searchParams.get("importance");
  if (importance && (importance === "all" || IMPORTANCE.has(importance as ExecutiveActivityImportance))) {
    filters.importance = importance as ExecutiveActivityFilters["importance"];
  }

  const module = searchParams.get("module");
  if (module) filters.sourceModule = module === "all" ? "all" : module;

  const unreadOnly = searchParams.get("unread");
  if (unreadOnly === "1" || unreadOnly === "true") filters.unreadOnly = true;

  const limit = searchParams.get("limit");
  if (limit) {
    const n = Number(limit);
    if (Number.isFinite(n) && n > 0) filters.limit = Math.min(n, 100);
  }

  const readerKey =
    typeof auth === "object" && auth && "email" in auth && typeof auth.email === "string"
      ? auth.email
      : "studio";

  const data = await getExecutiveActivityCenter(filters, readerKey);
  return NextResponse.json({ success: true, data });
}
