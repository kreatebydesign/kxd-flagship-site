import "server-only";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getPayloadAdminUser,
  requirePayloadAdminApi,
  requirePayloadAdminPage,
} from "@/lib/admin/auth";
import { staffActorFromUser } from "./actor";
import {
  STAFF_HOME_PATH,
  STAFF_WELCOME_PATH,
  actorHasStaffCapability,
  assertStaffCapability,
  isRestrictedStaff,
  isStaffAllowedApiPath,
  isStaffAllowedPagePath,
  isStaffWorkListAllowed,
} from "./permissions";
import type { StaffCapability } from "./types";
import { getStaffPreviewSession } from "./preview";

export async function resolveRequestPathname(
  fallback = STAFF_HOME_PATH,
): Promise<string> {
  const h = await headers();
  return (
    h.get("x-kxd-pathname") ||
    h.get("next-url") ||
    h.get("x-invoke-path") ||
    fallback
  );
}

/**
 * Gate operations pages for restricted staff (deny-by-default).
 * Admins pass through. Staff land on staff home / welcome.
 */
export async function requireStaffAwarePage(returnPath?: string) {
  const user = await requirePayloadAdminPage(returnPath ?? STAFF_HOME_PATH);
  const actor = staffActorFromUser(user);
  if (!actor) return user;

  const rawPath = await resolveRequestPathname("");
  const pathname = rawPath || "";

  if (isRestrictedStaff(actor)) {
    // Fail closed when pathname cannot be resolved.
    if (!pathname) {
      redirect(STAFF_HOME_PATH);
    }

    if (
      !actor.onboardingCompletedAt &&
      !pathname.startsWith(STAFF_WELCOME_PATH) &&
      !pathname.startsWith("/admin/training")
    ) {
      redirect(STAFF_WELCOME_PATH);
    }

    if (
      pathname === "/admin/operations" ||
      pathname === "/admin/operations/" ||
      pathname === "/admin/operations/today" ||
      pathname.startsWith("/admin/operations/today/")
    ) {
      redirect(STAFF_HOME_PATH);
    }

    if (!isStaffWorkListAllowed(pathname, actor)) {
      redirect(STAFF_HOME_PATH);
    }

    if (!isStaffAllowedPagePath(pathname, actor)) {
      redirect(STAFF_HOME_PATH);
    }
  }

  return user;
}

export async function requireStaffCapabilityApi(capability: StaffCapability) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;
  const actor = staffActorFromUser(auth);
  if (!actor) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const preview = await getStaffPreviewSession();
  if (preview) {
    return NextResponse.json(
      {
        success: false,
        error: "Preview mode is read-only. Changes are disabled.",
      },
      { status: 403 },
    );
  }

  const pathname = await resolveRequestPathname("/api/admin/staff");
  if (!isStaffAllowedApiPath(pathname, actor) && isRestrictedStaff(actor)) {
    return NextResponse.json(
      { success: false, error: "Staff permission denied for this API." },
      { status: 403 },
    );
  }

  try {
    assertStaffCapability(actor, capability);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Permission denied.",
      },
      { status: 403 },
    );
  }

  return { user: auth, actor };
}

export async function requireAdminOversightApi() {
  return requireStaffCapabilityApi("admin.oversight");
}

export async function getStaffActorOrNull() {
  const user = await getPayloadAdminUser();
  return staffActorFromUser(user);
}

export function staffCanUseFullNav(user: unknown): boolean {
  const actor = staffActorFromUser(user as Record<string, unknown>);
  if (!actor) return false;
  return actorHasStaffCapability(actor, "admin.full-operations");
}
