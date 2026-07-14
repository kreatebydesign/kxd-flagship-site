/**
 * Focused auth regression checks for portal/admin cookie separation.
 * Run: npx tsx scripts/verify-portal-admin-auth-boundaries.ts
 */
import { readFileSync } from "node:fs";
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
      access.includes('user.collection === "portal-users"') &&
      access.includes("return false"),
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

  console.log("\nAuth boundary verification passed.\n");
  console.log("Notes:");
  console.log(
    "- LocalAPI payload.login restores lockout without writing payload-token.",
  );
  console.log(
    "- Residual risk: Payload REST /api/portal-users/login still sets payload-token.",
  );
  console.log(
    "- Admin hardening rejects portal-users JWTs even if that cookie is present.",
  );
}

main();
