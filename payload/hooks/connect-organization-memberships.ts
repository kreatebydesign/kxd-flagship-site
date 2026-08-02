import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
} from "payload";
import { ValidationError } from "payload";
import {
  connectMembershipIdentityKey,
  validateConnectMembershipDraft,
} from "../../lib/connect/memberships.ts";
import type {
  ConnectMembershipRole,
  ConnectSubjectKind,
} from "../../lib/connect/types.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function resolveRelId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = Number((value as AnyDoc).id);
    return Number.isFinite(id) ? id : null;
  }
  if (typeof value === "string" && value.trim()) {
    const id = Number(value);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

/**
 * Fail closed on invalid identity/organization and reject duplicates.
 */
export const rejectInvalidConnectMembershipHook: CollectionBeforeChangeHook =
  async ({ data, operation, originalDoc, req }) => {
    if (!data || typeof data !== "object") return data;

    const next = data as AnyDoc;
    const prev = (originalDoc ?? {}) as AnyDoc;

    const organizationId =
      resolveRelId(next.organization) ??
      (operation === "update" ? resolveRelId(prev.organization) : null);
    const subjectKind = (next.subjectKind ??
      prev.subjectKind ??
      null) as ConnectSubjectKind | null;
    const staffUserId =
      resolveRelId(next.staffUser) ??
      (operation === "update" && subjectKind === "staff-user"
        ? resolveRelId(prev.staffUser)
        : null);
    const portalUserId =
      resolveRelId(next.portalUser) ??
      (operation === "update" && subjectKind === "portal-user"
        ? resolveRelId(prev.portalUser)
        : null);
    const role = (next.role ?? prev.role ?? null) as ConnectMembershipRole | null;
    const status =
      (next.status ?? prev.status ?? "active") as "active" | "disabled" | null;

    const validation = validateConnectMembershipDraft({
      organizationId,
      subjectKind,
      staffUserId,
      portalUserId,
      role,
      status,
    });

    if (!validation.ok) {
      throw new ValidationError({
        collection: "connect-organization-memberships",
        errors: [
          {
            path:
              validation.reason === "invalid_organization"
                ? "organization"
                : validation.reason === "invalid_role"
                  ? "role"
                  : "subjectKind",
            message: validation.message,
          },
        ],
      });
    }

    // Confirm organization exists (fail closed).
    const orgResult = await req.payload.find({
      collection: "connect-organizations" as never,
      where: { id: { equals: organizationId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (orgResult.docs.length === 0) {
      throw new ValidationError({
        collection: "connect-organization-memberships",
        errors: [
          {
            path: "organization",
            message: "Connect organization does not exist.",
          },
        ],
      });
    }

    if (subjectKind === "staff-user") {
      const userResult = await req.payload.find({
        collection: "users" as never,
        where: { id: { equals: staffUserId } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      if (userResult.docs.length === 0) {
        throw new ValidationError({
          collection: "connect-organization-memberships",
          errors: [
            {
              path: "staffUser",
              message: "Staff user does not exist.",
            },
          ],
        });
      }
      next.portalUser = null;
    }

    if (subjectKind === "portal-user") {
      const userResult = await req.payload.find({
        collection: "portal-users" as never,
        where: { id: { equals: portalUserId } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      if (userResult.docs.length === 0) {
        throw new ValidationError({
          collection: "connect-organization-memberships",
          errors: [
            {
              path: "portalUser",
              message: "Portal user does not exist.",
            },
          ],
        });
      }
      next.staffUser = null;
    }

    const candidateKey = connectMembershipIdentityKey({
      organizationId: organizationId!,
      subjectKind: subjectKind!,
      staffUserId,
      portalUserId,
    });

    const existing = await req.payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-organization-memberships" as any,
      where:
        subjectKind === "staff-user"
          ? {
              and: [
                { organization: { equals: organizationId! } },
                { subjectKind: { equals: "staff-user" } },
                { staffUser: { equals: staffUserId! } },
              ],
            }
          : {
              and: [
                { organization: { equals: organizationId! } },
                { subjectKind: { equals: "portal-user" } },
                { portalUser: { equals: portalUserId! } },
              ],
            },
      limit: 2,
      depth: 0,
      overrideAccess: true,
    });

    const selfId =
      operation === "update" && typeof prev.id !== "undefined"
        ? Number(prev.id)
        : null;

    const conflict = existing.docs.find(
      (doc) => Number((doc as AnyDoc).id) !== selfId,
    );
    if (conflict) {
      throw new ValidationError({
        collection: "connect-organization-memberships",
        errors: [
          {
            path: subjectKind === "staff-user" ? "staffUser" : "portalUser",
            message:
              `Duplicate Connect membership for ${candidateKey}. ` +
              "Reactivate or update the existing membership instead.",
          },
        ],
      });
    }

    return data;
  };

export const auditConnectMembershipChangeHook: CollectionAfterChangeHook =
  async ({ doc, previousDoc, operation, req, context }) => {
    if (context?.skipConnectAudit) return doc;

    try {
      const row = doc as AnyDoc;
      const prev = (previousDoc ?? {}) as AnyDoc;
      const organizationId = resolveRelId(row.organization);
      const actorOperatorUserId =
        req.user?.collection === "users" ? Number(req.user.id) : null;

      if (operation === "create") {
        const { appendConnectAuditEvent } = await import(
          "../../lib/connect/audit.ts"
        );
        await appendConnectAuditEvent({
          type: "membership.created",
          organizationId,
          actorKind: actorOperatorUserId != null ? "operator" : "system",
          actorOperatorUserId,
          summary: "Connect membership created.",
          metadata: {
            membershipId: Number(row.id),
            role: row.role,
            subjectKind: row.subjectKind,
            status: row.status,
          },
        });
        return doc;
      }

      if (operation === "update") {
        const { appendConnectAuditEvent } = await import(
          "../../lib/connect/audit.ts"
        );
        if (prev.role && row.role && prev.role !== row.role) {
          await appendConnectAuditEvent({
            type: "membership.role_changed",
            organizationId,
            actorKind: actorOperatorUserId != null ? "operator" : "system",
            actorOperatorUserId,
            summary: "Connect membership role changed.",
            metadata: {
              membershipId: Number(row.id),
              fromRole: prev.role,
              toRole: row.role,
            },
          });
        }
        if (prev.status !== "disabled" && row.status === "disabled") {
          await appendConnectAuditEvent({
            type: "membership.disabled",
            organizationId,
            actorKind: actorOperatorUserId != null ? "operator" : "system",
            actorOperatorUserId,
            summary: "Connect membership disabled.",
            metadata: { membershipId: Number(row.id) },
          });
        }
      }
    } catch (err) {
      console.warn("[KXD Connect] membership audit hook failed:", err);
    }

    return doc;
  };
