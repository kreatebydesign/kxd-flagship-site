/**
 * Phase 6 Batch C1 — plain-text message content validation.
 *
 * No rich text, HTML, Markdown rendering, embeds, or attachments in C1.
 */

import { CONNECT_MESSAGE_MAX_LENGTH } from "../types";

export type ConnectMessageContentFailure =
  | "empty"
  | "too_long"
  | "invalid_type";

export type ConnectMessageContentResult =
  | { ok: true; body: string }
  | { ok: false; reason: ConnectMessageContentFailure; message: string };

/**
 * Normalize and validate plain-text message content.
 * Whitespace-only bodies are rejected. Leading/trailing whitespace is trimmed.
 */
export function validateConnectMessageContent(
  raw: unknown,
  maxLength: number = CONNECT_MESSAGE_MAX_LENGTH,
): ConnectMessageContentResult {
  if (typeof raw !== "string") {
    return {
      ok: false,
      reason: "invalid_type",
      message: "Message content must be plain text.",
    };
  }

  const body = raw.replace(/\r\n/g, "\n").trim();
  if (!body) {
    return {
      ok: false,
      reason: "empty",
      message: "Message content cannot be empty.",
    };
  }

  if (body.length > maxLength) {
    return {
      ok: false,
      reason: "too_long",
      message: `Message content exceeds the ${maxLength}-character limit.`,
    };
  }

  return { ok: true, body };
}

export function validateConnectGroupTitle(
  raw: unknown,
): { ok: true; title: string | null } | { ok: false; message: string } {
  if (raw == null || raw === "") {
    return { ok: true, title: null };
  }
  if (typeof raw !== "string") {
    return { ok: false, message: "Conversation title must be text." };
  }
  const title = raw.trim().replace(/\s+/g, " ");
  if (!title) return { ok: true, title: null };
  if (title.length > 120) {
    return { ok: false, message: "Conversation title exceeds 120 characters." };
  }
  return { ok: true, title };
}
