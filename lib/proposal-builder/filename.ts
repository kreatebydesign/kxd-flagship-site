/**
 * Safe proposal PDF filenames — local calendar dates.
 */

import { toProposalCalendarDateString } from "./calendar-date.ts";
import type { CanonicalProposal } from "./types.ts";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function proposalDateStamp(iso: string | null | undefined): string {
  const stamped = toProposalCalendarDateString(iso);
  if (stamped) return stamped;
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

export function buildProposalPdfFilename(proposal: CanonicalProposal): string {
  const org = slugify(proposal.primaryOrganization || "client") || "client";
  const date = proposalDateStamp(proposal.proposalDate);
  return `kxd-proposal-${org}-${date}.pdf`;
}

export function buildProposalPdfFilenameExternal(proposal: CanonicalProposal): string {
  const number = slugify(proposal.proposalNumber || "proposal") || "proposal";
  const date = proposalDateStamp(proposal.proposalDate);
  return `KXD-Proposal-${number}-${date}.pdf`;
}
