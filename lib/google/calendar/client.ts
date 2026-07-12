/**
 * Phase 25C — Authenticated Google Calendar API client (read-only).
 * Uses plain fetch — no googleapis SDK.
 */

import "server-only";

import { getGoogleCalendarAccessToken } from "./auth";
import {
  GoogleCalendarError,
  googleCalendarErrorFromHttp,
} from "./errors";
import { GOOGLE_CALENDAR_API_BASE } from "./types";

export async function calendarApiRequest<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const accessToken = await getGoogleCalendarAccessToken();
  const timeoutMs = init?.timeoutMs ?? 12_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const url = path.startsWith("http")
    ? path
    : `${GOOGLE_CALENDAR_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const { timeoutMs: _t, ...rest } = init ?? {};
    void _t;
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(rest.headers ?? {}),
      },
    });
    clearTimeout(timer);

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw googleCalendarErrorFromHttp(res.status, text);
    }

    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (err) {
      throw new GoogleCalendarError(
        "malformed_response",
        "Google Calendar returned non-JSON body.",
        { cause: err },
      );
    }
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof GoogleCalendarError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new GoogleCalendarError(
        "network_failure",
        "Google Calendar request timed out.",
        { retryable: true, cause: err },
      );
    }
    throw new GoogleCalendarError(
      "network_failure",
      "Google Calendar network request failed.",
      { retryable: true, cause: err },
    );
  }
}

export async function calendarApiJson<T>(
  path: string,
  body: unknown,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  return calendarApiRequest<T>(path, {
    ...init,
    method: init?.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
}
