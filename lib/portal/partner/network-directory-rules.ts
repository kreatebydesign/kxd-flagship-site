/**
 * Pure Network directory visibility rules — no Payload, no I/O.
 */

export type NetworkDirectoryVisibility = "private" | "published";

export type NetworkDirectoryRecognition =
  | "First introduction"
  | "Client won"
  | "Paid record"
  | "Trusted Partner";

export type NetworkDirectoryMemberPublic = {
  id: number;
  displayName: string;
  cityMarket: string | null;
  companyOrRole: string | null;
  connectionLanes: string[];
  profileLine: string | null;
  markUrl: string | null;
  recognitions: NetworkDirectoryRecognition[];
};

export type NetworkDirectoryShowcasePublic = {
  id: number;
  companyName: string;
  categoryMarket: string | null;
  workDescription: string | null;
  markUrl: string | null;
  websiteUrl: string | null;
  creditedMemberName: string | null;
};

export type NetworkDirectoryMemberSource = {
  id: number;
  displayName: string;
  status: "active" | "invited" | "inactive";
  directoryVisibility: NetworkDirectoryVisibility;
  cityMarket: string | null;
  companyOrRole: string | null;
  connectionLanes: string[];
  profileLine: string | null;
  markUrl: string | null;
  trustedPartner: boolean;
  hasFirstIntroduction: boolean;
  hasClientWon: boolean;
  hasPaidRecord: boolean;
};

export type NetworkDirectoryShowcaseSource = {
  id: number;
  directoryVisibility: NetworkDirectoryVisibility;
  ownerApprovedForNetwork: boolean;
  companyName: string;
  categoryMarket: string | null;
  workDescription: string | null;
  markUrl: string | null;
  websiteUrl: string | null;
  creditAttribution: boolean;
  creditedMemberName: string | null;
  sortOrder: number;
};

export type OwnerNetworkProfileFields = {
  partnerId: number;
  displayName: string;
  status: "active" | "invited" | "inactive";
  directoryVisibility: NetworkDirectoryVisibility;
  cityMarket: string;
  companyOrRole: string;
  connectionLane1: string;
  connectionLane2: string;
  connectionLane3: string;
  profileLine: string;
  directoryMarkId: number | null;
  directoryMarkUrl: string | null;
  trustedPartner: boolean;
};

export type OwnerNetworkShowcaseFields = {
  id: number;
  directoryVisibility: NetworkDirectoryVisibility;
  companyName: string;
  categoryMarket: string;
  workDescription: string;
  markId: number | null;
  markUrl: string | null;
  websiteUrl: string;
  creditedPartnerId: number | null;
  creditedPartnerName: string | null;
  creditAttribution: boolean;
  ownerApprovedForNetwork: boolean;
  sortOrder: number;
};

/** Pure — which earned recognitions may appear for a published member. */
export function buildNetworkDirectoryRecognitions(input: {
  hasFirstIntroduction: boolean;
  hasClientWon: boolean;
  hasPaidRecord: boolean;
  trustedPartner: boolean;
}): NetworkDirectoryRecognition[] {
  const out: NetworkDirectoryRecognition[] = [];
  if (input.hasFirstIntroduction) out.push("First introduction");
  if (input.hasClientWon) out.push("Client won");
  if (input.hasPaidRecord) out.push("Paid record");
  if (input.trustedPartner) out.push("Trusted Partner");
  return out;
}

/** Pure — only active + published members enter the partner directory. */
export function selectPublishedDirectoryMembers(
  sources: readonly NetworkDirectoryMemberSource[],
): NetworkDirectoryMemberPublic[] {
  return sources
    .filter(
      (row) =>
        row.status === "active" && row.directoryVisibility === "published",
    )
    .map((row) => ({
      id: row.id,
      displayName: row.displayName,
      cityMarket: row.cityMarket,
      companyOrRole: row.companyOrRole,
      connectionLanes: row.connectionLanes.slice(0, 3),
      profileLine: row.profileLine,
      markUrl: row.markUrl,
      recognitions: buildNetworkDirectoryRecognitions(row),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/** Pure — published + owner-approved showcase only; attribution only when enabled. */
export function selectPublishedShowcaseItems(
  sources: readonly NetworkDirectoryShowcaseSource[],
): NetworkDirectoryShowcasePublic[] {
  return [...sources]
    .filter(
      (row) =>
        row.directoryVisibility === "published" &&
        row.ownerApprovedForNetwork === true &&
        Boolean(row.companyName.trim()),
    )
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.companyName.localeCompare(b.companyName);
    })
    .map((row) => ({
      id: row.id,
      companyName: row.companyName.trim(),
      categoryMarket: row.categoryMarket,
      workDescription: row.workDescription,
      markUrl: row.markUrl,
      websiteUrl: row.websiteUrl,
      creditedMemberName:
        row.creditAttribution && row.creditedMemberName
          ? row.creditedMemberName
          : null,
    }));
}

/** Deny-list check for partner-facing directory JSON payloads. */
export function directoryPayloadContainsRestrictedKeys(
  payload: unknown,
): string[] {
  const forbidden = [
    "email",
    "phone",
    "notes",
    "internalNotes",
    "invite",
    "invitation",
    "earnings",
    "paidEarningsCents",
    "approvedEarningsCents",
    "amountCents",
    "referral",
    "booking",
    "salesLead",
    "portalUser",
    "token",
    "password",
  ];
  const found = new Set<string>();
  const walk = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item));
      return;
    }
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const lower = key.toLowerCase();
      for (const needle of forbidden) {
        if (lower.includes(needle.toLowerCase())) {
          found.add(key);
        }
      }
      walk(child);
    }
  };
  walk(payload);
  return [...found].sort();
}
