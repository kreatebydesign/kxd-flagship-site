/**
 * Multi-client portal readiness — server-controlled gate.
 * Default unavailable until membership schema probes successfully.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  MEMBERSHIP_COLLECTION,
  isMembershipSchemaUnavailableError,
} from "./membership-schema";

export type MultiClientPortalReadiness = {
  membershipSchemaAvailable: boolean;
  /** Switching UI may render only when schema is available AND caller has >1 accounts. */
  switchingCapable: boolean;
  /** Portfolio overview remains off until an explicit future capability ships. */
  portfolioCapable: false;
};

/**
 * Probe whether portal-client-memberships is queryable.
 * Narrowly treats missing-schema as unavailable; unrelated errors propagate.
 */
export async function probeMembershipSchemaAvailable(
  payloadClient?: Awaited<ReturnType<typeof getPayload>>,
): Promise<boolean> {
  const payload = payloadClient ?? (await getPayload({ config }));
  try {
    await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: MEMBERSHIP_COLLECTION as any,
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    return true;
  } catch (err) {
    if (isMembershipSchemaUnavailableError(err)) return false;
    throw err;
  }
}

export async function getMultiClientPortalReadiness(
  payloadClient?: Awaited<ReturnType<typeof getPayload>>,
): Promise<MultiClientPortalReadiness> {
  const membershipSchemaAvailable =
    await probeMembershipSchemaAvailable(payloadClient);
  return {
    membershipSchemaAvailable,
    switchingCapable: membershipSchemaAvailable,
    portfolioCapable: false,
  };
}
