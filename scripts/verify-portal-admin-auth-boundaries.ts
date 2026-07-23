/**
 * Focused auth regression checks for portal/admin cookie separation.
 * Run: npx tsx scripts/verify-portal-admin-auth-boundaries.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) throw new Error(label);
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function main() {
  console.log("\nAuth boundary verification\n");

  const login = read("app/api/portal/auth/login/route.ts");
  const logout = read("app/api/portal/auth/logout/route.ts");
  const session = read("lib/portal/session.ts");
  const constants = read("lib/portal/constants.ts");
  const adminAuth = read("lib/admin/auth.ts");
  const access = read("payload/access/index.ts");
  const portalUsers = read("payload/collections/PortalUsers.ts");
  const users = read("payload/collections/Users.ts");
  const payloadConfig = read("payload.config.ts");
  const middleware = read("lib/admin/middleware.ts");
  const payloadAuthCookie = read(
    "node_modules/@payloadcms/next/dist/utilities/setPayloadAuthCookie.js",
  );
  const payloadLoginOp = read("node_modules/payload/dist/auth/operations/login.js");
  const authenticateLocal = read(
    "node_modules/payload/dist/auth/strategies/local/authenticate.js",
  );
  const cookiesJs = read("node_modules/payload/dist/auth/cookies.js");

  check(
    "portal login uses payload.login LocalAPI (lockout path)",
    login.includes("payload.login(") &&
      login.includes('collection: PORTAL_USERS_COLLECTION') &&
      !login.includes("verifyPayloadLocalPassword") &&
      !login.includes("pbkdf2"),
  );

  check(
    "portal login documents that LocalAPI does not set payload-token",
    login.includes("Does not set cookies") || login.includes("does not overwrite"),
  );

  check(
    "portal login still enforces active === false after login",
    login.includes("portalUser.active === false"),
  );

  check(
    "portal logout clears kxd-portal-session only",
    logout.includes("destroyPortalSession") &&
      session.includes('cookieStore.delete(PORTAL_SESSION_COOKIE)') &&
      constants.includes('kxd-portal-session') &&
      !logout.includes("payload-token"),
  );

  check(
    "portal session cookie is httpOnly + sameSite lax + 7d maxAge",
    session.includes("httpOnly: true") &&
      session.includes('sameSite: "lax"') &&
      session.includes("SESSION_MAX_AGE = 60 * 60 * 24 * 7") &&
      session.includes('secure: process.env.NODE_ENV === "production"'),
  );

  check(
    "portal session signed with HMAC over portal:userId",
    session.includes('update(`portal:${portalUserId}`)') &&
      session.includes("timingSafeEqual"),
  );

  check(
    "getPortalSession rejects inactive users",
    session.includes("user.active === false") && session.includes("return null"),
  );

  check(
    "admin auth requires users collection",
    adminAuth.includes('user.collection !== "users"') &&
      access.includes('return user.collection === "users"') &&
      !access.includes("user.collection === undefined"),
  );

  check(
    "isAuthenticated is admin-only (portal JWT cannot pass REST access)",
    access.includes("export const isAuthenticated") &&
      access.includes("isPayloadAdmin(user)") &&
      !/\(\{\s*req:\s*\{\s*user\s*\}\s*\}\)\s*=>\s*Boolean\(user\)/.test(access),
  );

  check(
    "PortalUsers mutations are admin-only (no client pivot via REST)",
    portalUsers.includes("create: isPayloadAdminUser") &&
      portalUsers.includes("update: isPayloadAdminUser") &&
      portalUsers.includes("delete: isPayloadAdminUser") &&
      !portalUsers.includes("create: isAuthenticated") &&
      !portalUsers.includes("update: isAuthenticated"),
  );

  check(
    "production rejects PAYLOAD_SECRET development fallback",
    payloadConfig.includes("PAYLOAD_DEV_SECRET_FALLBACK") &&
      payloadConfig.includes("isDeployedProductionRuntime") &&
      payloadConfig.includes("The development fallback secret is not permitted"),
  );

  check(
    "admin auth uses payload.auth (not only first strategy win assumed as admin)",
    adminAuth.includes("payload.auth({ headers: headersList })"),
  );

  check(
    "PortalUsers configures lockout (maxLoginAttempts + lockTime)",
    portalUsers.includes("maxLoginAttempts: 8") && portalUsers.includes("lockTime: 600"),
  );

  check(
    "Users collection remains Payload admin auth",
    users.includes('slug: "users"') && users.includes("auth: true"),
  );

  check(
    "payload.config does not define per-collection cookie names / cookiePrefix override",
    !payloadConfig.includes("cookiePrefix") &&
      !/cookies\s*:\s*\{/.test(portalUsers) &&
      !/cookies\s*:\s*\{/.test(users),
  );

  check(
    "Payload cookie name is global `${cookiePrefix}-token`",
    cookiesJs.includes("` ${cookiePrefix}-token`".replace(" ", "")) ||
      cookiesJs.includes("${cookiePrefix}-token"),
  );

  check(
    "setPayloadAuthCookie only used by @payloadcms/next auth helpers (not LocalAPI login.js operation)",
    payloadAuthCookie.includes("cookies.set") &&
      !payloadLoginOp.includes("setPayloadAuthCookie") &&
      !payloadLoginOp.includes("generatePayloadCookie"),
  );

  check(
    "Payload password alg remains pbkdf2 25000/512/sha256",
    authenticateLocal.includes("25000") &&
      authenticateLocal.includes("512") &&
      authenticateLocal.includes("'sha256'"),
  );

  check(
    "admin middleware token check prefers payload-token",
    middleware.includes("payload-token") || middleware.includes("${PAYLOAD_AUTH_COOKIE_PREFIX}-token") ||
      middleware.includes("`-token`"),
  );

  const edgeMiddleware = read("middleware.ts");
  check(
    "portal middleware requires well-formed session cookie (not presence alone)",
    edgeMiddleware.includes("isWellFormedPortalSessionCookie") &&
      edgeMiddleware.includes(String.raw`/^\d+\.[a-f0-9]{64}$/i`) &&
      !edgeMiddleware.includes(
        'hasSession && pathname.startsWith("/portal/login")',
      ),
  );

  const portalLoginPage = read("app/(portal)/portal/(auth)/login/page.tsx");
  check(
    "portal login page redirects only after getPortalSession() succeeds",
    portalLoginPage.includes("getPortalSession") &&
      portalLoginPage.includes("if (session)") &&
      portalLoginPage.includes("redirect("),
  );

  const unguardedAdminRoutes: string[] = [];
  const adminRouteRoot = path.join(root, "app/api/admin");
  function walkAdminRoutes(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkAdminRoutes(full);
        continue;
      }
      if (entry.name !== "route.ts") continue;
      const src = readFileSync(full, "utf8");
      const rel = path.relative(root, full);
      if (
        !src.includes("requirePayloadAdminApi") &&
        !src.includes("authorizeReportingIngest")
      ) {
        unguardedAdminRoutes.push(rel);
      }
    }
  }
  walkAdminRoutes(adminRouteRoot);
  check(
    "every /api/admin route validates Payload admin (or scoped reporting ingest auth)",
    unguardedAdminRoutes.length === 0,
    unguardedAdminRoutes.slice(0, 8).join(", "),
  );

  const sensitiveAdminRoutes = [
    "app/api/admin/brain/route.ts",
    "app/api/admin/brain/search/route.ts",
    "app/api/admin/executive-notes/route.ts",
    "app/api/admin/executive-notes/[id]/timeline/route.ts",
    "app/api/admin/client-command/actions/route.ts",
    "app/api/admin/client-command/communications/route.ts",
  ];
  for (const rel of sensitiveAdminRoutes) {
    const src = read(rel);
    check(
      `${rel} calls requirePayloadAdminApi`,
      src.includes("requirePayloadAdminApi") &&
        src.includes("if (auth instanceof NextResponse) return auth"),
    );
  }

  console.log("\nAuth boundary verification passed.\n");
  console.log("Notes:");
  console.log(
    "- LocalAPI payload.login restores lockout without writing payload-token.",
  );
  console.log(
    "- Residual risk: Payload REST /api/portal-users/login can still set payload-token,",
  );
  console.log(
    "  but portal-users JWTs fail isAuthenticated / isPayloadAdmin and cannot mutate",
  );
  console.log(
    "  portal-users.client or read KXD OS collections via REST.",
  );
  console.log(
    "- Admin hardening rejects portal-users JWTs even if that cookie is present.",
  );
}

main();
