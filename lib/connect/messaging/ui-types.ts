/**
 * Phase 6 Batch C2 — minimized Connect UI DTOs.
 *
 * No internal numeric IDs, organization IDs, membership IDs, pair keys,
 * other users' read state, audit records, or meter keys.
 */

export type ConnectUiConversation = {
  publicId: string;
  type: "direct" | "group";
  status: "active" | "archived";
  title: string | null;
  displayLabel: string;
  participantLabels: string[];
  latestMessageAt: string | null;
  latestPreview: string | null;
  unreadCount: number;
  selfParticipantPublicId: string | null;
  createdAt: string;
};

export type ConnectUiMessage = {
  publicId: string;
  body: string;
  createdAt: string;
  authorParticipantPublicId: string | null;
  authorDisplayName: string;
  isSelf: boolean;
};

export type ConnectUiEligibleMember = {
  /** Opaque staff email used only for authorized create/add within the session org. */
  staffEmail: string;
  displayName: string;
};

export type ConnectUiUnread = {
  conversationPublicId: string;
  unreadCount: number;
  lastReadMessagePublicId: string | null;
  latestMessagePublicId: string | null;
};

/** C2 group size bound — small internal groups only. */
export const CONNECT_GROUP_MAX_PARTICIPANTS = 12;
