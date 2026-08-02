import type { CollectionAfterChangeHook } from "payload";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export const auditConnectOrganizationChangeHook: CollectionAfterChangeHook =
  async ({ doc, previousDoc, operation, req, context }) => {
    if (context?.skipConnectAudit) return doc;

    try {
      const row = doc as AnyDoc;
      const prev = (previousDoc ?? {}) as AnyDoc;
      const actorOperatorUserId =
        req.user?.collection === "users" ? Number(req.user.id) : null;
      const { appendConnectAuditEvent } = await import(
        "../../lib/connect/audit.ts"
      );

      if (operation === "create") {
        await appendConnectAuditEvent({
          type: "organization.created",
          organizationId: Number(row.id),
          actorKind: actorOperatorUserId != null ? "operator" : "system",
          actorOperatorUserId,
          summary: "Connect organization created.",
          metadata: { key: row.key, status: row.status },
        });
        return doc;
      }

      if (operation === "update") {
        if (prev.status !== "active" && row.status === "active") {
          await appendConnectAuditEvent({
            type: "organization.activated",
            organizationId: Number(row.id),
            actorKind: actorOperatorUserId != null ? "operator" : "system",
            actorOperatorUserId,
            summary: "Connect organization activated.",
            metadata: { key: row.key },
          });
        }
        if (prev.status === "active" && row.status === "inactive") {
          await appendConnectAuditEvent({
            type: "organization.deactivated",
            organizationId: Number(row.id),
            actorKind: actorOperatorUserId != null ? "operator" : "system",
            actorOperatorUserId,
            summary: "Connect organization deactivated.",
            metadata: { key: row.key },
          });
        }
      }
    } catch (err) {
      console.warn("[KXD Connect] organization audit hook failed:", err);
    }

    return doc;
  };
