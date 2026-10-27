/**
 * Studio-operator gate for intentional KXD acquisition promotion APIs.
 * Restricted staff (including BDS) are deny-by-default elsewhere; this fails closed with an explicit message.
 */
import "server-only";

import { NextResponse } from "next/server";
import type { StaffActor } from "@/lib/staff/types";
import { acquisitionPromoteAllowedForActor } from "./acquisition-promote-access-policy";

export function acquisitionPromoteOperatorDenied(
  actor: StaffActor | null,
): NextResponse | null {
  if (!actor) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 },
    );
  }
  if (acquisitionPromoteAllowedForActor(actor)) return null;
  return NextResponse.json(
    {
      success: false,
      error: "Acquisition promotion requires studio operator access.",
    },
    { status: 403 },
  );
}
