import assert from "node:assert/strict";
import test from "node:test";
import type { PortalAccountContextSummary } from "@/lib/portal/account-context-types";
import type { PortalSession } from "@/lib/portal/session";
import { canAccessDonYourSpace } from "./access";
import { DON_CUSICK_PORTAL_EMAIL, DON_CUSICK_PORTFOLIO_CLIENT_IDS } from "./constants";

function mockSession(overrides: Partial<PortalSession> = {}): PortalSession {
  return {
    portalUserId: 13,
    clientId: DON_CUSICK_PORTFOLIO_CLIENT_IDS[0],
    accessMode: "client",
    email: DON_CUSICK_PORTAL_EMAIL,
    displayName: "Don Cusick",
    greetingName: "Don",
    clientName: "Cusick Morgan Motorsports",
    welcomeCompletedAt: null,
    isOperatorPreview: false,
    operatorPreview: null,
    ...overrides,
  };
}

function mockAccountContext(
  authorizedClientIds: number[],
): PortalAccountContextSummary {
  return {
    portalUserId: 13,
    activeClientId: authorizedClientIds[0] ?? DON_CUSICK_PORTFOLIO_CLIENT_IDS[0],
    activeClientName: "Cusick Morgan Motorsports",
    accessSource: "membership",
    switchingAvailable: authorizedClientIds.length > 1,
    portfolioAccessAvailable: authorizedClientIds.length > 1,
    authorizedClientIds,
    switcher: null,
  };
}

test("canAccessDonYourSpace allows Don with full portfolio membership", () => {
  assert.equal(
    canAccessDonYourSpace({
      session: mockSession(),
      accountContext: mockAccountContext([...DON_CUSICK_PORTFOLIO_CLIENT_IDS]),
    }),
    true,
  );
});

test("canAccessDonYourSpace rejects wrong email", () => {
  assert.equal(
    canAccessDonYourSpace({
      session: mockSession({ email: "other@example.com" }),
      accountContext: mockAccountContext([...DON_CUSICK_PORTFOLIO_CLIENT_IDS]),
    }),
    false,
  );
});

test("canAccessDonYourSpace rejects partial portfolio", () => {
  assert.equal(
    canAccessDonYourSpace({
      session: mockSession(),
      accountContext: mockAccountContext([5, 9]),
    }),
    false,
  );
});

test("canAccessDonYourSpace rejects partner mode", () => {
  assert.equal(
    canAccessDonYourSpace({
      session: mockSession({ accessMode: "partner" }),
      accountContext: mockAccountContext([...DON_CUSICK_PORTFOLIO_CLIENT_IDS]),
    }),
    false,
  );
});

test("canAccessDonYourSpace operator preview only on portfolio client ids", () => {
  assert.equal(
    canAccessDonYourSpace({
      session: mockSession({ isOperatorPreview: true, clientId: 5 }),
      accountContext: null,
    }),
    true,
  );
  assert.equal(
    canAccessDonYourSpace({
      session: mockSession({ isOperatorPreview: true, clientId: 99 }),
      accountContext: null,
    }),
    false,
  );
});