import { NextResponse } from "next/server";
import {
  authorizeInventoryMediaMigrationRunnerBearer,
  isInventoryMediaMigrationRunnerCallable,
  parseMigrateAction,
  runInventoryMediaProductionMigrate,
} from "@/lib/internal/inventory-media-production-migrate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const NO_STORE = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function notFound() {
  return json({ ok: false, error: "Not found." }, 404);
}

function unauthorized() {
  return json({ ok: false, error: "Unauthorized." }, 401);
}

export async function POST(request: Request): Promise<Response> {
  if (!isInventoryMediaMigrationRunnerCallable()) {
    return notFound();
  }

  if (
    !authorizeInventoryMediaMigrationRunnerBearer(
      request.headers.get("authorization"),
    )
  ) {
    return unauthorized();
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const action = parseMigrateAction(body);
  if (!action) {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  try {
    const result = await runInventoryMediaProductionMigrate({
      action,
      confirmApply: action === "apply",
    });
    return json(result.body, result.status);
  } catch {
    return json({ ok: false, error: "Migration runner failed." }, 500);
  }
}
