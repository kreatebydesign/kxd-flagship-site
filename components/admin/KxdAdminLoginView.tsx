import type { AdminViewServerProps } from "payload";
import { redirect } from "next/navigation";
import { getSafeRedirect } from "payload/shared";
import { OPERATIONS_HOME_PATH } from "@/lib/admin/constants";
import { PayloadLogo } from "./PayloadLogo";
import { KxdAdminLoginForm } from "./KxdAdminLoginForm";

/**
 * Custom Payload Admin Login view.
 * Experience Refinement Phase 2 Batch B — Arrival owns Welcomed.
 * Auth mechanics unchanged; emotional first impression is KXD OS, not CMS.
 */
export function KxdAdminLoginView({
  initPageResult,
  searchParams,
}: AdminViewServerProps) {
  const {
    req: {
      user,
      payload: {
        config: {
          admin: { user: userSlug },
        },
        collections,
      },
    },
  } = initPageResult;

  const redirectParam =
    typeof searchParams?.redirect === "string"
      ? searchParams.redirect
      : Array.isArray(searchParams?.redirect)
        ? searchParams.redirect[0]
        : undefined;

  // Phase 7 Batch C — founder login lands on Today (sole home).
  const redirectUrl = getSafeRedirect({
    fallbackTo: OPERATIONS_HOME_PATH,
    redirectTo: redirectParam ?? OPERATIONS_HOME_PATH,
  });

  if (user) {
    redirect(redirectUrl);
  }

  const authCollection =
    userSlug in collections
      ? collections[userSlug as keyof typeof collections]
      : undefined;
  const collectionConfig = authCollection?.config;
  const localStrategyDisabled = Boolean(
    collectionConfig?.auth &&
      "disableLocalStrategy" in collectionConfig.auth &&
      collectionConfig.auth.disableLocalStrategy,
  );

  return (
    <div className="kxd-admin-login" data-experience="welcomed">
      <div className="login__brand">
        <PayloadLogo />
        <p className="kxd-admin-login__welcome">
          Enter your business. Today is waiting.
        </p>
      </div>
      {!localStrategyDisabled ? (
        <KxdAdminLoginForm searchParams={searchParams} />
      ) : null}
    </div>
  );
}
