/**
 * Client-scoped managed-client inquiry ledger loader.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getManagedClientLeadPolicy } from "@/lib/acquisition-operations/policy";
import "@/lib/acquisition-operations/policies/register";
import { CLIENT_INQUIRIES_COLLECTION } from "./collection";
import { mapDocToRecord } from "./map";
import { ledgerScopeWhere } from "./isolation";
import {
  type ClientLeadLedgerSnapshot,
} from "./types";

export async function loadClientLeadLedger(input: {
  clientId: number;
  clientKey: string;
  limit?: number;
}): Promise<ClientLeadLedgerSnapshot> {
  const policy = getManagedClientLeadPolicy(input.clientKey);
  const empty: ClientLeadLedgerSnapshot = {
    clientId: input.clientId,
    clientKey: input.clientKey,
    policyEnabled: Boolean(policy?.enabled),
    policyDisplayName: policy?.displayName ?? null,
    attributionReconciliationEnabled: Boolean(
      policy?.attributionReconciliationEnabled,
    ),
    ga4PropertyIds: policy ? [...policy.ga4PropertyIds] : [],
    commissionOnConfirmedSale: Boolean(policy?.commissionOnConfirmedSale),
    commissionAmountCents: policy?.commissionAmountCents ?? null,
    portalModuleEnabled: Boolean(policy?.portalModuleEnabled),
    inquiries: [],
    counts: {
      total: 0,
      new: 0,
      unverified: 0,
      qualified: 0,
      matched: 0,
      inquiryWithoutAds: 0,
      adsWithoutInquiry: 0,
    },
  };

  if (!policy?.enabled) return empty;

  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: CLIENT_INQUIRIES_COLLECTION,
      depth: 0,
      limit: input.limit ?? 100,
      sort: "-receivedAt",
      where: ledgerScopeWhere(input.clientId, input.clientKey),
      overrideAccess: true,
    });

    const inquiries = result.docs.map((doc) =>
      mapDocToRecord(doc as unknown as Record<string, unknown>),
    );

    return {
      ...empty,
      inquiries,
      counts: {
        total: inquiries.length,
        new: inquiries.filter((i) => i.operationalStatus === "new").length,
        unverified: inquiries.filter((i) => i.verificationState === "unverified")
          .length,
        qualified: inquiries.filter((i) => i.qualificationState === "qualified")
          .length,
        matched: inquiries.filter((i) => i.reconciliationState === "matched")
          .length,
        inquiryWithoutAds: inquiries.filter(
          (i) => i.reconciliationState === "inquiry_without_ads",
        ).length,
        adsWithoutInquiry: inquiries.filter(
          (i) => i.reconciliationState === "ads_without_inquiry",
        ).length,
      },
    };
  } catch {
    // Collection may not exist until migration is applied — degrade empty.
    return empty;
  }
}
