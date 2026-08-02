"use client";

/**
 * Phase 6 Batch C2 — staff-only Connect messaging workspace.
 *
 * Uses C1 APIs via minimized UI DTOs. Short polling while thread is selected
 * and document is visible. Mark-read after thread is visibly active with
 * newest message rendered (not on list fetch).
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { CONNECT_MESSAGE_MAX_LENGTH } from "@/lib/connect/types";
import { CONNECT_GROUP_MAX_PARTICIPANTS } from "@/lib/connect/messaging/ui-types";
import type {
  ConnectUiConversation,
  ConnectUiEligibleMember,
  ConnectUiMessage,
} from "@/lib/connect/messaging/ui-types";
import {
  createConversation,
  fetchConversations,
  fetchEligibleMembers,
  fetchMessages,
  formatConnectTime,
  markConversationRead,
  sendMessage,
} from "./connect-client";
import { ConnectUnavailable } from "./ConnectUnavailable";

const POLL_MS = 12_000;

type Props = {
  organizationName: string;
  staffDisplayName: string;
  staffEmail: string;
  initialConversations: ConnectUiConversation[];
  listLoadFailed?: boolean;
};

function mergeByPublicId(
  existing: ConnectUiMessage[],
  incoming: ConnectUiMessage[],
): ConnectUiMessage[] {
  const map = new Map<string, ConnectUiMessage>();
  for (const m of existing) map.set(m.publicId, m);
  for (const m of incoming) map.set(m.publicId, m);
  return [...map.values()].sort((a, b) => {
    if (a.createdAt < b.createdAt) return -1;
    if (a.createdAt > b.createdAt) return 1;
    return a.publicId < b.publicId ? -1 : a.publicId > b.publicId ? 1 : 0;
  });
}

export function ConnectMessagingScreen({
  organizationName,
  staffDisplayName,
  staffEmail,
  initialConversations,
  listLoadFailed = false,
}: Props) {
  const [conversations, setConversations] =
    useState<ConnectUiConversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConnectUiMessage[]>([]);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<string | null>(
    listLoadFailed ? "Unable to refresh conversations." : null,
  );
  const [liveStatus, setLiveStatus] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const [composerError, setComposerError] = useState<string | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [newType, setNewType] = useState<"direct" | "group">("direct");
  const [members, setMembers] = useState<ConnectUiEligibleMember[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const dialogTitleId = useId();
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const pollInFlight = useRef(false);
  const markReadDoneFor = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const newestCursorRef = useRef<string | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const selected = conversations.find((c) => c.publicId === selectedId) ?? null;

  const handleAccessFailure = useCallback((kind: string) => {
    if (kind === "unavailable" || kind === "unauthorized") {
      setUnavailable(true);
      setConversations([]);
      setMessages([]);
      setSelectedId(null);
    }
  }, []);

  const refreshList = useCallback(async () => {
    setRefreshing(true);
    const result = await fetchConversations();
    setRefreshing(false);
    if (!result.ok) {
      handleAccessFailure(result.kind);
      if (result.kind === "error") setStatus(result.message);
      return;
    }
    setStatus(null);
    setConversations(result.conversations);
  }, [handleAccessFailure]);

  const openConversation = useCallback(
    async (publicId: string) => {
      setSelectedId(publicId);
      setMobileView("thread");
      setLoadingThread(true);
      setComposerError(null);
      setStatus(null);
      markReadDoneFor.current = null;
      const result = await fetchMessages({
        conversationPublicId: publicId,
        direction: "before",
        limit: 40,
      });
      setLoadingThread(false);
      if (!result.ok) {
        handleAccessFailure(result.kind);
        setMessages([]);
        if (result.kind === "error") setStatus(result.message);
        return;
      }
      setMessages(result.messages);
      setHasMoreOlder(result.hasMore);
      setOlderCursor(result.prevCursor);
      newestCursorRef.current = result.nextCursor;
      setLiveStatus("Conversation opened.");
    },
    [handleAccessFailure],
  );

  // Mark-read after thread is active and newest message rendered — not on list fetch.
  useEffect(() => {
    if (!selectedId || messages.length === 0 || loadingThread) return;
    if (markReadDoneFor.current === selectedId) return;
    const newest = messages[messages.length - 1];
    if (!newest) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled || selectedIdRef.current !== selectedId) return;
      const result = await markConversationRead({
        conversationPublicId: selectedId,
        targetMessagePublicId: newest.publicId,
      });
      if (!result.ok) {
        handleAccessFailure(result.kind);
        return;
      }
      markReadDoneFor.current = selectedId;
      setConversations((prev) =>
        prev.map((c) =>
          c.publicId === selectedId
            ? { ...c, unreadCount: result.unread.unreadCount }
            : c,
        ),
      );
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [selectedId, messages, loadingThread, handleAccessFailure]);

  // Short polling — selected thread + document visible only.
  useEffect(() => {
    if (!selectedId) return;

    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      if (pollInFlight.current) return;
      pollInFlight.current = true;
      try {
        const result = await fetchMessages({
          conversationPublicId: selectedId,
          cursor: newestCursorRef.current,
          direction: "after",
          limit: 40,
        });
        if (!result.ok) {
          handleAccessFailure(result.kind);
          return;
        }
        if (result.messages.length > 0) {
          setMessages((prev) => mergeByPublicId(prev, result.messages));
          newestCursorRef.current =
            result.nextCursor ?? newestCursorRef.current;
          // New messages after trusted cursor remain unread until mark-read rule runs.
          markReadDoneFor.current = null;
          void refreshList();
        }
      } finally {
        pollInFlight.current = false;
      }
    };

    const id = window.setInterval(tick, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [selectedId, handleAccessFailure, refreshList]);

  const loadOlder = async () => {
    if (!selectedId || !olderCursor || loadingOlder) return;
    const el = messagesRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    setLoadingOlder(true);
    const result = await fetchMessages({
      conversationPublicId: selectedId,
      cursor: olderCursor,
      direction: "before",
      limit: 40,
    });
    setLoadingOlder(false);
    if (!result.ok) {
      handleAccessFailure(result.kind);
      return;
    }
    setMessages((prev) => mergeByPublicId(result.messages, prev));
    setHasMoreOlder(result.hasMore);
    setOlderCursor(result.prevCursor);
    requestAnimationFrame(() => {
      if (!el) return;
      el.scrollTop = el.scrollHeight - prevHeight;
    });
    setLiveStatus("Older messages loaded.");
  };

  const onSend = async () => {
    if (!selectedId || sending) return;
    const body = draft;
    const trimmed = body.trim();
    if (!trimmed) {
      setComposerError("Message cannot be empty.");
      return;
    }
    if (trimmed.length > CONNECT_MESSAGE_MAX_LENGTH) {
      setComposerError(
        `Message exceeds ${CONNECT_MESSAGE_MAX_LENGTH} characters.`,
      );
      return;
    }
    setSending(true);
    setComposerError(null);
    const result = await sendMessage({
      conversationPublicId: selectedId,
      body,
    });
    setSending(false);
    if (!result.ok) {
      handleAccessFailure(result.kind);
      setComposerError(result.message);
      setLiveStatus("Send failed.");
      return;
    }
    setDraft("");
    setMessages((prev) => mergeByPublicId(prev, [result.message]));
    // Re-fetch a bounded page after confirmed send for cursor accuracy.
    const refreshed = await fetchMessages({
      conversationPublicId: selectedId,
      direction: "before",
      limit: 40,
    });
    if (refreshed.ok) {
      setMessages(refreshed.messages);
      setHasMoreOlder(refreshed.hasMore);
      setOlderCursor(refreshed.prevCursor);
      newestCursorRef.current = refreshed.nextCursor;
    }
    markReadDoneFor.current = null;
    setLiveStatus("Message sent.");
    void refreshList();
  };

  const onComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSend();
    }
  };

  const openNewDialog = async () => {
    setNewOpen(true);
    setMembersError(null);
    setSelectedEmails([]);
    setGroupTitle("");
    setNewType("direct");
    const result = await fetchEligibleMembers();
    if (!result.ok) {
      handleAccessFailure(result.kind);
      setMembersError(result.message);
      setMembers([]);
      return;
    }
    setMembers(result.members);
  };

  const submitNew = async (e: FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setMembersError(null);
    const result =
      newType === "direct"
        ? await createConversation({
            type: "direct",
            otherStaffEmail: selectedEmails[0] ?? "",
          })
        : await createConversation({
            type: "group",
            title: groupTitle,
            memberStaffEmails: selectedEmails,
          });
    setCreating(false);
    if (!result.ok) {
      handleAccessFailure(result.kind);
      setMembersError(result.message);
      return;
    }
    setNewOpen(false);
    setConversations((prev) => {
      const others = prev.filter(
        (c) => c.publicId !== result.conversation.publicId,
      );
      return [result.conversation, ...others];
    });
    await openConversation(result.conversation.publicId);
  };

  const remaining = CONNECT_MESSAGE_MAX_LENGTH - draft.length;
  const countClass =
    remaining < 0
      ? "kxd-connect__count--over"
      : remaining < 200
        ? "kxd-connect__count--warn"
        : "";

  if (unavailable) {
    return <ConnectUnavailable />;
  }

  return (
    <div className="kxd-connect">
      <header className="kxd-connect__header">
        <div>
          <p className="kxd-connect__eyebrow">KXD Connect</p>
          <h1 className="kxd-connect__title">Messages</h1>
        </div>
        <p className="kxd-connect__meta">
          {staffDisplayName}
          <br />
          {organizationName}
        </p>
      </header>

      <div
        className="kxd-connect__workspace"
        data-mobile-view={mobileView}
      >
        <section
          className="kxd-connect__list-panel"
          aria-label="Conversations"
        >
          <div className="kxd-connect__panel-toolbar">
            <h2>Conversations</h2>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button
                type="button"
                className="kxd-connect__btn kxd-connect__btn--ghost"
                onClick={() => void refreshList()}
                disabled={refreshing}
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
              <button
                type="button"
                className="kxd-connect__btn kxd-connect__btn--primary"
                onClick={() => void openNewDialog()}
              >
                New
              </button>
            </div>
          </div>

          {conversations.length === 0 ? (
            <p className="kxd-connect__empty">
              No conversations yet. Start a direct or group conversation with
              eligible staff in your organization.
            </p>
          ) : (
            <ul className="kxd-connect__conv-list">
              {conversations.map((c) => (
                <li key={c.publicId}>
                  <button
                    type="button"
                    className="kxd-connect__conv-item"
                    aria-current={c.publicId === selectedId ? "true" : undefined}
                    onClick={() => void openConversation(c.publicId)}
                  >
                    <div className="kxd-connect__conv-row">
                      <p className="kxd-connect__conv-label">{c.displayLabel}</p>
                      <p className="kxd-connect__conv-time">
                        {formatConnectTime(c.latestMessageAt ?? c.createdAt)}
                      </p>
                    </div>
                    <p className="kxd-connect__conv-preview">
                      {c.latestPreview || "No messages yet"}
                    </p>
                    <div className="kxd-connect__badge-row">
                      <span className="kxd-connect__type">
                        {c.type === "direct" ? "Direct" : "Group"}
                        {c.status === "archived" ? " · Archived" : ""}
                      </span>
                      {c.unreadCount > 0 ? (
                        <span
                          className="kxd-connect__unread"
                          aria-label={`${c.unreadCount} unread`}
                        >
                          {c.unreadCount > 99 ? "99+" : c.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="kxd-connect__thread-panel"
          aria-label="Message thread"
        >
          {!selected ? (
            <p className="kxd-connect__empty">
              Select a conversation to read and send messages.
            </p>
          ) : (
            <>
              <div className="kxd-connect__thread-header">
                <button
                  type="button"
                  className="kxd-connect__btn kxd-connect__btn--ghost"
                  onClick={() => setMobileView("list")}
                  aria-label="Back to conversations"
                >
                  Back
                </button>
                <div style={{ minWidth: 0 }}>
                  <h2>{selected.displayLabel}</h2>
                  <p className="kxd-connect__thread-sub">
                    {selected.type === "group"
                      ? selected.participantLabels.join(", ") || "Group"
                      : selected.participantLabels[0] || "Direct"}
                    {selected.status === "archived" ? " · Archived" : ""}
                  </p>
                </div>
              </div>

              <div className="kxd-connect__panel-toolbar">
                {hasMoreOlder ? (
                  <button
                    type="button"
                    className="kxd-connect__btn"
                    onClick={() => void loadOlder()}
                    disabled={loadingOlder}
                    aria-busy={loadingOlder}
                  >
                    {loadingOlder ? "Loading…" : "Load older messages"}
                  </button>
                ) : (
                  <span className="kxd-connect__type">Beginning of history</span>
                )}
              </div>

              <div
                className="kxd-connect__messages"
                ref={messagesRef}
                aria-busy={loadingThread}
              >
                {loadingThread ? (
                  <p className="kxd-connect__empty">Loading messages…</p>
                ) : messages.length === 0 ? (
                  <p className="kxd-connect__empty">
                    No messages yet. Say hello.
                  </p>
                ) : (
                  messages.map((m) => (
                    <article
                      key={m.publicId}
                      className={
                        m.isSelf
                          ? "kxd-connect__msg kxd-connect__msg--self"
                          : "kxd-connect__msg"
                      }
                    >
                      <div className="kxd-connect__msg-meta">
                        <span>{m.isSelf ? "You" : m.authorDisplayName}</span>
                        <time dateTime={m.createdAt}>
                          {formatConnectTime(m.createdAt)}
                        </time>
                      </div>
                      <p className="kxd-connect__msg-body">{m.body}</p>
                    </article>
                  ))
                )}
              </div>

              {selected.status === "archived" ? (
                <p className="kxd-connect__empty" role="status">
                  This conversation is archived. Sending is unavailable.
                </p>
              ) : (
                <form
                  className="kxd-connect__composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void onSend();
                  }}
                >
                  <label className="kxd-connect__sr-only" htmlFor="connect-draft">
                    Message
                  </label>
                  <textarea
                    id="connect-draft"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onComposerKeyDown}
                    placeholder="Write a message… (Enter to send, Shift+Enter for new line)"
                    maxLength={CONNECT_MESSAGE_MAX_LENGTH + 200}
                    disabled={sending}
                  />
                  <div className="kxd-connect__composer-row">
                    <p className={`kxd-connect__count ${countClass}`}>
                      {remaining} characters remaining
                    </p>
                    <button
                      type="submit"
                      className="kxd-connect__btn kxd-connect__btn--primary"
                      disabled={sending || draft.trim().length === 0 || remaining < 0}
                    >
                      {sending ? "Sending…" : "Send"}
                    </button>
                  </div>
                  {composerError ? (
                    <p className="kxd-connect__status" role="alert">
                      {composerError}
                    </p>
                  ) : null}
                </form>
              )}
            </>
          )}
        </section>
      </div>

      {status ? (
        <p className="kxd-connect__status" role="alert">
          {status}
        </p>
      ) : null}
      <p className="kxd-connect__sr-only" aria-live="polite">
        {liveStatus}
      </p>

      {newOpen ? (
        <div
          className="kxd-connect__dialog-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setNewOpen(false);
          }}
        >
          <div
            className="kxd-connect__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onKeyDown={(e) => {
              if (e.key === "Escape") setNewOpen(false);
            }}
          >
            <h2 id={dialogTitleId}>New conversation</h2>
            <div className="kxd-connect__tabs" role="tablist">
              <button
                type="button"
                className="kxd-connect__btn"
                role="tab"
                aria-selected={newType === "direct"}
                onClick={() => {
                  setNewType("direct");
                  setSelectedEmails((prev) => prev.slice(0, 1));
                }}
              >
                Direct
              </button>
              <button
                type="button"
                className="kxd-connect__btn"
                role="tab"
                aria-selected={newType === "group"}
                onClick={() => setNewType("group")}
              >
                Group
              </button>
            </div>

            <form onSubmit={(e) => void submitNew(e)}>
              {newType === "group" ? (
                <div className="kxd-connect__field">
                  <label htmlFor="connect-group-title">Title</label>
                  <input
                    id="connect-group-title"
                    value={groupTitle}
                    onChange={(e) => setGroupTitle(e.target.value)}
                    required
                    maxLength={120}
                  />
                </div>
              ) : null}

              <div className="kxd-connect__field">
                <label>
                  {newType === "direct"
                    ? "Select one staff member"
                    : `Select members (max ${CONNECT_GROUP_MAX_PARTICIPANTS - 1})`}
                </label>
                {members.length === 0 ? (
                  <p className="kxd-connect__empty" style={{ margin: 0 }}>
                    No eligible staff available in this organization.
                  </p>
                ) : (
                  <ul className="kxd-connect__member-list">
                    {members.map((m) => {
                      const checked = selectedEmails.includes(m.staffEmail);
                      return (
                        <li key={m.staffEmail}>
                          <label>
                            <input
                              type={newType === "direct" ? "radio" : "checkbox"}
                              name="connect-member"
                              checked={checked}
                              onChange={() => {
                                if (newType === "direct") {
                                  setSelectedEmails([m.staffEmail]);
                                  return;
                                }
                                setSelectedEmails((prev) => {
                                  if (prev.includes(m.staffEmail)) {
                                    return prev.filter((e) => e !== m.staffEmail);
                                  }
                                  if (prev.length >= CONNECT_GROUP_MAX_PARTICIPANTS - 1) {
                                    return prev;
                                  }
                                  return [...prev, m.staffEmail];
                                });
                              }}
                            />
                            <span>
                              {m.displayName}
                              <span className="kxd-connect__type">
                                {" "}
                                · {m.staffEmail}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {membersError ? (
                <p className="kxd-connect__status" role="alert">
                  {membersError}
                </p>
              ) : null}

              <div className="kxd-connect__composer-row">
                <button
                  type="button"
                  className="kxd-connect__btn"
                  onClick={() => setNewOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="kxd-connect__btn kxd-connect__btn--primary"
                  disabled={
                    creating ||
                    selectedEmails.length === 0 ||
                    (newType === "group" && !groupTitle.trim())
                  }
                >
                  {creating ? "Creating…" : "Start"}
                </button>
              </div>
            </form>
            <p className="kxd-connect__type">
              Signed in as {staffEmail}. Same-organization staff only.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
