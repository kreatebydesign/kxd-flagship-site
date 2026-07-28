/**
 * Shared HTTP mapping for Phase 3 schema-unavailable responses.
 */
import { NextResponse } from "next/server";
import {
  Phase3SchemaUnavailableError,
  phase3UnavailableResponseBody,
} from "@/lib/executive-client-workspace/phase3-schema";

export function phase3UnavailableHttpResponse(
  extra: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json(phase3UnavailableResponseBody(extra), { status: 503 });
}

export function isPhase3UnavailableThrown(err: unknown): boolean {
  return err instanceof Phase3SchemaUnavailableError;
}
