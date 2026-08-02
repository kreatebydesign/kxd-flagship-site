/**
 * Phase 6 Batch C1 — shared HTTP helpers for Connect messaging APIs.
 */

import { NextResponse } from "next/server";

export const CONNECT_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
} as const;

export function connectJson(
  body: unknown,
  init?: { status?: number },
): NextResponse {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: CONNECT_NO_STORE_HEADERS,
  });
}

export function connectMethodNotAllowed(): NextResponse {
  return connectJson(
    { ok: false, message: "Method not allowed." },
    { status: 405 },
  );
}

export function connectUnavailable(): NextResponse {
  return connectJson(
    { ok: false, message: "Connect is unavailable." },
    { status: 403 },
  );
}

export function connectNotFound(): NextResponse {
  return connectJson({ ok: false, message: "Not found." }, { status: 404 });
}

export function connectBadRequest(message: string): NextResponse {
  return connectJson({ ok: false, message }, { status: 400 });
}

/** Max JSON body size for C1 messaging mutations (bytes). */
export const CONNECT_MAX_REQUEST_BODY_BYTES = 16_384;

export async function readBoundedJsonBody(
  req: Request,
): Promise<
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; response: NextResponse }
> {
  const contentLength = req.headers.get("content-length");
  if (
    contentLength &&
    Number(contentLength) > CONNECT_MAX_REQUEST_BODY_BYTES
  ) {
    return {
      ok: false,
      response: connectBadRequest("Request body too large."),
    };
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: connectBadRequest("Invalid JSON body."),
    };
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      response: connectBadRequest("Request body must be an object."),
    };
  }

  const encoded = JSON.stringify(raw);
  if (encoded.length > CONNECT_MAX_REQUEST_BODY_BYTES) {
    return {
      ok: false,
      response: connectBadRequest("Request body too large."),
    };
  }

  return { ok: true, value: raw as Record<string, unknown> };
}
