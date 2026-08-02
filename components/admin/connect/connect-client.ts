/**
 * Phase 6 Batch C2 — client fetch helpers for Connect staff UI.
 * Never logs message bodies. Credentials same-origin only.
 */

import type {
  ConnectUiConversation,
  ConnectUiEligibleMember,
  ConnectUiMessage,
  ConnectUiUnread,
} from "@/lib/connect/messaging/ui-types";

export type ConnectFetchFailure = {
  ok: false;
  kind: "unauthorized" | "unavailable" | "error";
  message: string;
};

function isFailure(
  value: Response | ConnectFetchFailure,
): value is ConnectFetchFailure {
  return "ok" in value && value.ok === false;
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function redirectLogin(): never {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams({ redirect: "/admin/connect" });
    window.location.assign(`/admin/login?${params.toString()}`);
  }
  throw new Error("Unauthorized");
}

export async function connectFetch(
  input: string,
  init?: RequestInit,
): Promise<Response | ConnectFetchFailure> {
  const res = await fetch(input, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    redirectLogin();
  }
  if (res.status === 403) {
    return {
      ok: false,
      kind: "unavailable",
      message: "Connect is unavailable.",
    };
  }
  return res;
}

export async function fetchConversations(): Promise<
  | { ok: true; conversations: ConnectUiConversation[] }
  | ConnectFetchFailure
> {
  const res = await connectFetch("/api/admin/connect/conversations");
  if (isFailure(res)) return res;
  const body = await parseJson(res);
  if (!res.ok || body.ok !== true) {
    return {
      ok: false,
      kind: "error",
      message: "Unable to load conversations.",
    };
  }
  return {
    ok: true,
    conversations: (body.conversations ?? []) as ConnectUiConversation[],
  };
}

export async function fetchMessages(input: {
  conversationPublicId: string;
  cursor?: string | null;
  direction?: "before" | "after";
  limit?: number;
}): Promise<
  | {
      ok: true;
      messages: ConnectUiMessage[];
      nextCursor: string | null;
      prevCursor: string | null;
      hasMore: boolean;
      selfParticipantPublicId: string | null;
    }
  | ConnectFetchFailure
> {
  const params = new URLSearchParams();
  if (input.cursor) params.set("cursor", input.cursor);
  if (input.direction) params.set("direction", input.direction);
  if (input.limit) params.set("limit", String(input.limit));
  const qs = params.toString();
  const url = `/api/admin/connect/conversations/${encodeURIComponent(input.conversationPublicId)}/messages${qs ? `?${qs}` : ""}`;
  const res = await connectFetch(url);
  if (isFailure(res)) return res;
  const body = await parseJson(res);
  if (!res.ok || body.ok !== true) {
    if (res.status === 404) {
      return { ok: false, kind: "unavailable", message: "Not found." };
    }
    return { ok: false, kind: "error", message: "Unable to load messages." };
  }
  return {
    ok: true,
    messages: (body.messages ?? []) as ConnectUiMessage[],
    nextCursor: (body.nextCursor as string | null) ?? null,
    prevCursor: (body.prevCursor as string | null) ?? null,
    hasMore: Boolean(body.hasMore),
    selfParticipantPublicId:
      (body.selfParticipantPublicId as string | null) ?? null,
  };
}

export async function sendMessage(input: {
  conversationPublicId: string;
  body: string;
}): Promise<{ ok: true; message: ConnectUiMessage } | ConnectFetchFailure> {
  const res = await connectFetch(
    `/api/admin/connect/conversations/${encodeURIComponent(input.conversationPublicId)}/messages`,
    { method: "POST", body: JSON.stringify({ body: input.body }) },
  );
  if (isFailure(res)) return res;
  const json = await parseJson(res);
  if (!res.ok || json.ok !== true) {
    return {
      ok: false,
      kind: "error",
      message:
        typeof json.message === "string"
          ? json.message
          : "Unable to send message.",
    };
  }
  return { ok: true, message: json.message as ConnectUiMessage };
}

export async function markConversationRead(input: {
  conversationPublicId: string;
  targetMessagePublicId?: string | null;
}): Promise<
  | { ok: true; unread: ConnectUiUnread; changed: boolean }
  | ConnectFetchFailure
> {
  const res = await connectFetch(
    `/api/admin/connect/conversations/${encodeURIComponent(input.conversationPublicId)}/read`,
    {
      method: "POST",
      body: JSON.stringify({
        targetMessagePublicId: input.targetMessagePublicId ?? null,
      }),
    },
  );
  if (isFailure(res)) return res;
  const json = await parseJson(res);
  if (!res.ok || json.ok !== true) {
    return { ok: false, kind: "error", message: "Unable to mark read." };
  }
  return {
    ok: true,
    unread: json.unread as ConnectUiUnread,
    changed: Boolean(json.changed),
  };
}

export async function fetchEligibleMembers(): Promise<
  | { ok: true; members: ConnectUiEligibleMember[] }
  | ConnectFetchFailure
> {
  const res = await connectFetch("/api/admin/connect/members");
  if (isFailure(res)) return res;
  const json = await parseJson(res);
  if (!res.ok || json.ok !== true) {
    return { ok: false, kind: "error", message: "Unable to load members." };
  }
  return { ok: true, members: (json.members ?? []) as ConnectUiEligibleMember[] };
}

export async function createConversation(
  input:
    | { type: "direct"; otherStaffEmail: string }
    | { type: "group"; title: string; memberStaffEmails: string[] },
): Promise<
  | { ok: true; conversation: ConnectUiConversation; created?: boolean }
  | ConnectFetchFailure
> {
  const res = await connectFetch("/api/admin/connect/conversations", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (isFailure(res)) return res;
  const json = await parseJson(res);
  if (!res.ok || json.ok !== true) {
    return {
      ok: false,
      kind: "error",
      message:
        typeof json.message === "string"
          ? json.message
          : "Unable to create conversation.",
    };
  }
  return {
    ok: true,
    conversation: json.conversation as ConnectUiConversation,
    created: Boolean(json.created),
  };
}

export function formatConnectTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
