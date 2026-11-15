import assert from "node:assert/strict";
import test from "node:test";
import { canAccessDonYourSpace } from "./access";
import { DON_CUSICK_PORTAL_EMAIL, DON_CUSICK_PORTFOLIO_CLIENT_IDS } from "./constants";

function session(overrides: Partial<{
  email: string;
  clientId: number;
  isOperatorPreview: boolean;
  accessMode: string;
}> = {}) {
  return {
    accessMode: "client" as const,
    clientId: DON_CUSICK_PORTFOLIO_CLIENT_IDS[0],
    email: DON_CUSICK_PORTAL_EMAIL,
    isOperatorPreview: false,
    portalUserId: 13,
    clientName: "Cusick Morgan Motorsports",
    ...overrides,
  };
}

test("canAccessDonYourSpace allows Don with full portfolio membership", () => {
  assert.equal(
    canAccessDonYourSpace({
      session: session(),
      accountContext: { authorizedClientIds: [...DON_CUSICK_PORTFOLIO_CLIENT_IDS] },
    }),
    true,
  );
});

test("canAccessDonYourSpace rejects wrong email", () => {
  assert.equal(
    canAccessDonYourSpace({
      session: session({ email: "other@example.com" }),
      accountContext: { authorizedClientIds: [...DON_CUSICK_PORTFOLIO_CLIENT_IDS] },
    }),
    false,
  );
});

test("canAccessDonYourSpace rejects partial portfolio", () => {
  assert.equal(
    canAccessDonYourSpace({
      session: session(),
      accountContext: { authorizedClientIds: [5, 9] },
    }),
    false,
  );
});

test("canAccessDonYourSpace rejects partner mode", () => {
  assert.equal(
    canAccessDonYourSpace({
      session: session({ accessMode: "partner" }),
      accountContext: { authorizedClientIds: [...DON_CUSICK_PORTFOLIO_CLIENT_IDS] },
    }),
    false,
  );
});

test("canAccessDonYourSpace operator preview only on portfolio client ids", () => {
  assert.equal(
    canAccessDonYourSpace({
      session: session({ isOperatorPreview: true, clientId: 5 }),
      accountContext: null,
    }),
    true,
  );
  assert.equal(
    canAccessDonYourSpace({
      session: session({ isOperatorPreview: true, clientId: 99 }),
      accountContext: null,
    }),
    false,
  );
});