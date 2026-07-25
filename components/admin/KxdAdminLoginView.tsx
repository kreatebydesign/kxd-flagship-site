import type { AdminViewServerProps } from "payload";
import { redirect } from "next/navigation";
import { getSafeRedirect } from "payload/shared";
import { PayloadLogo } from "./PayloadLogo";
import { KxdAdminLoginForm } from "./KxdAdminLoginForm";

/**
 * Custom Payload Admin Login view.
 * Replaces stock LoginView so authentication uses a real semantic form with
 * Enter-key submission, while preserving Payload session cookies + redirects.
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
          routes: { admin: adminRoute },
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

  const redirectUrl = getSafeRedirect({
    fallbackTo: adminRoute,
    redirectTo: redirectParam ?? adminRoute,
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
    <>
      <div className="login__brand">
        <PayloadLogo />
      </div>
      {!localStrategyDisabled ? (
        <KxdAdminLoginForm searchParams={searchParams} />
      ) : null}
    </>
  );
}
