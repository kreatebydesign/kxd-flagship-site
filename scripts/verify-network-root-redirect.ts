import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PORTAL_HOST } from "../lib/portal/constants";
import {
  NETWORK_HOST,
  NETWORK_ROOT_LOGIN_PATH,
  networkRootRedirectPath,
} from "../lib/portal/network-root";

const root = process.cwd();
const middleware = readFileSync(path.join(root, "middleware.ts"), "utf8");

assert.equal(NETWORK_HOST, "network.kreatebydesign.com");
assert.equal(NETWORK_ROOT_LOGIN_PATH, "/portal/login?redirect=/portal/partner");
assert.equal(networkRootRedirectPath("/", NETWORK_HOST), NETWORK_ROOT_LOGIN_PATH);
assert.equal(networkRootRedirectPath("/", `${NETWORK_HOST}:443`), NETWORK_ROOT_LOGIN_PATH);
assert.equal(networkRootRedirectPath("/", PORTAL_HOST), null);
assert.equal(networkRootRedirectPath("/", "kreatebydesign.com"), null);
assert.equal(networkRootRedirectPath("/", "www.kreatebydesign.com"), null);
assert.equal(networkRootRedirectPath("/portal", NETWORK_HOST), null);
assert.equal(networkRootRedirectPath("/portal/login", NETWORK_HOST), null);
assert.equal(networkRootRedirectPath("/admin", NETWORK_HOST), null);
assert.equal(networkRootRedirectPath("/api/health", NETWORK_HOST), null);
assert.match(middleware, /networkRootRedirectPath/);
assert.match(
  middleware,
  /return redirectWithPath\(new URL\("\/portal\/login", request\.url\)\);/,
);

console.log("verify-network-root-redirect: ok");
