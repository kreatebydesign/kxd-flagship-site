import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ClientInquiryRecord } from "@/lib/managed-client-leads/types";
import { matchesLeadListView } from "./inbox-view-filter";

function baseInquiry(overrides: Partial<ClientInquiryRecord> = {}): ClientInquiryRecord {
  return {
    id: 1,
    inquiryKey: "inq_test",
    clientId: 10,
    clientKey: "primal-motorsports",
    channel: "form",
    receivedAt: "2026-01-01T00:00:00.000Z",
    contactName: "Test",
    contactEmail: "test@example.com",
    contactPhone: "",
    messageSummary: "Hello",
    operationalStatus: "new",
    verificationState: "unverified",
    qualificationState: "unreviewed",
    outcomeState: "open",
    ...overrides,
  } as ClientInquiryRecord;
}

describe("matchesLeadListView", () => {
  it("separates registrations from general inquiries", () => {
    const reg = baseInquiry({ registrationId: "evtreg_a_b", paymentStatus: "paid" });
    const lead = baseInquiry();
    assert.equal(matchesLeadListView(reg, "registrations"), true);
    assert.equal(matchesLeadListView(lead, "registrations"), false);
    assert.equal(matchesLeadListView(lead, "leads"), true);
    assert.equal(matchesLeadListView(reg, "leads"), false);
    assert.equal(matchesLeadListView(reg, "all"), true);
  });
});