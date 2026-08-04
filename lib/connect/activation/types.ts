/**
 * Phase 6 Batch C4 — local dogfood activation types.
 *
 * Activation state is operator-owned, local-only, and fail-closed.
 * Never stores message or conversation content.
 */

export const CONNECT_LOCAL_ACTIVATION_VERSION = 1 as const;

export type ConnectLocalActivationState = {
  version: typeof CONNECT_LOCAL_ACTIVATION_VERSION;
  /** Intentional operator enablement. Default absent/false = OFF. */
  enabled: boolean;
  updatedAt: string;
  /** Normalized lowercase staff emails. Empty = deny (fail closed). */
  staffEmails: string[];
  /** Normalized lowercase organization keys. Empty = deny (fail closed). */
  organizationKeys: string[];
  /** Optional operator note — never secrets or chat content. */
  note?: string;
};

export type ConnectActivationLayer =
  | "kill_switch"
  | "global_feature"
  | "environment"
  | "local_activation"
  | "subject_kind"
  | "staff_allowlist"
  | "organization_allowlist"
  | "organization_active"
  | "membership_active";

export type ConnectOpsEventType =
  | "activation.enabled"
  | "activation.disabled"
  | "activation.status"
  | "authorization.success"
  | "authorization.failure"
  | "authorization.allowlist_denied"
  | "authorization.global_disabled"
  | "authorization.kill_switch"
  | "authorization.environment_denied"
  | "authorization.activation_denied";

export type ConnectOpsLogEntry = {
  at: string;
  type: ConnectOpsEventType;
  summary: string;
  /** Non-sensitive structured fields only. */
  meta?: Record<string, string | number | boolean | null>;
};
