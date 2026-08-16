/**
 * Registers managed-client lead policies into the shared registry.
 * Import this module once from the acquisition-operations index (side effect).
 */

import { registerManagedClientLeadPolicy } from "../policy";
import { OTP_CARTS_LEAD_POLICY } from "./otp-carts";
import { PRIMAL_MOTORSPORTS_LEAD_POLICY } from "./primal-motorsports";

let registered = false;

export function ensureManagedClientLeadPoliciesRegistered(): void {
  if (registered) return;
  registerManagedClientLeadPolicy(PRIMAL_MOTORSPORTS_LEAD_POLICY);
  registerManagedClientLeadPolicy(OTP_CARTS_LEAD_POLICY);
  registered = true;
}

ensureManagedClientLeadPoliciesRegistered();
