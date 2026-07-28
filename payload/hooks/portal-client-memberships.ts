import type { CollectionBeforeChangeHook } from "payload";
import { ValidationError } from "payload";

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
 * Reject duplicate (portalUser, client) memberships with a clear validation error.
 * Database unique index remains the hard guarantee.
 */
export const rejectDuplicateMembershipHook: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data || typeof data !== "object") return data;

  const portalUserId =
    resolveRelId((data as AnyDoc).portalUser) ??
    (operation === "update" ? resolveRelId((originalDoc as AnyDoc | undefined)?.portalUser) : null);
  const clientId =
    resolveRelId((data as AnyDoc).client) ??
    (operation === "update" ? resolveRelId((originalDoc as AnyDoc | undefined)?.client) : null);

  if (portalUserId == null || clientId == null) return data;

  const existing = await req.payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-client-memberships" as any,
    where: {
      and: [
        { portalUser: { equals: portalUserId } },
        { client: { equals: clientId } },
      ],
    },
    limit: 2,
    depth: 0,
    overrideAccess: true,
  });

  const selfId =
    operation === "update" && originalDoc && typeof (originalDoc as AnyDoc).id !== "undefined"
      ? Number((originalDoc as AnyDoc).id)
      : null;

  const conflict = existing.docs.find((doc) => Number((doc as AnyDoc).id) !== selfId);
  if (conflict) {
    throw new ValidationError({
      collection: "portal-client-memberships",
      errors: [
        {
          path: "client",
          message:
            "This portal user already has a membership for that client. " +
            "Reactivate the existing membership instead of creating a duplicate.",
        },
      ],
    });
  }

  return data;
};

/**
 * Ensure at most one active default membership per portal user.
 * When isDefault becomes true on an active membership, clear other defaults.
 * When status becomes disabled, clear isDefault on this row.
 */
export const enforceAtMostOneDefaultHook: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
  context,
}) => {
  if (!data || typeof data !== "object") return data;
  if (context?.skipDefaultEnforcement) return data;

  const next = data as AnyDoc;
  const prev = (originalDoc ?? {}) as AnyDoc;

  const status =
    typeof next.status === "string"
      ? next.status
      : typeof prev.status === "string"
        ? prev.status
        : "active";

  if (status === "disabled") {
    next.isDefault = false;
    return data;
  }

  const wantsDefault = next.isDefault === true;
  if (!wantsDefault) return data;

  const portalUserId =
    resolveRelId(next.portalUser) ?? resolveRelId(prev.portalUser);
  if (portalUserId == null) return data;

  const selfId =
    operation === "update" && typeof prev.id !== "undefined" ? Number(prev.id) : null;

  const others = await req.payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-client-memberships" as any,
    where: {
      and: [
        { portalUser: { equals: portalUserId } },
        { isDefault: { equals: true } },
      ],
    },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });

  for (const doc of others.docs as AnyDoc[]) {
    const id = Number(doc.id);
    if (!Number.isFinite(id) || id === selfId) continue;
    await req.payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-client-memberships" as any,
      id,
      data: { isDefault: false },
      overrideAccess: true,
      // Avoid re-entering default enforcement loops.
      context: { skipDefaultEnforcement: true },
    });
  }

  return data;
};
