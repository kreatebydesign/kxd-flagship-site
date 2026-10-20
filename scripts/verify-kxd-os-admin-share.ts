import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  KXD_OS_SHARE,
  kxdOsAdminLoginCanonicalUrl,
  kxdOsShareImageAbsoluteUrl,
} from "../lib/admin/kxd-os-share";
import { SITE } from "../lib/site";

const root = process.cwd();
const ogPath = path.join(root, "public", KXD_OS_SHARE.imagePath.replace(/^\//, ""));

assert.equal(KXD_OS_SHARE.title, "KXD OS | Kreate by Design");
assert.equal(
  KXD_OS_SHARE.description,
  "Secure access to the Kreate by Design operating system.",
);
assert.equal(KXD_OS_SHARE.siteName, "Kreate by Design");
assert.match(kxdOsShareImageAbsoluteUrl(), /^https:\/\//);
assert.equal(kxdOsAdminLoginCanonicalUrl(), `${SITE.url}/admin/login`);
assert.ok(existsSync(ogPath), `OG image must exist at public${KXD_OS_SHARE.imagePath}`);

const { width, height } = await sharp(ogPath).metadata();
assert.equal(width, 1200);
assert.equal(height, 630);

const payloadConfigSource = readFileSync(path.join(root, "payload.config.ts"), "utf8");
assert.match(payloadConfigSource, /serverURL:\s*SITE\.url/);
assert.match(payloadConfigSource, /defaultOGImageType:\s*"off"/);
assert.match(payloadConfigSource, /title:\s*"KXD OS"/);
assert.match(payloadConfigSource, /titleSuffix:\s*"\s*\|\s*Kreate by Design"/);
assert.match(payloadConfigSource, /description:\s*KXD_OS_SHARE\.description/);
assert.match(payloadConfigSource, /siteName:\s*KXD_OS_SHARE\.siteName/);
assert.match(payloadConfigSource, /icons:\s*KXD_OS_FAVICON_ICONS/);
assert.match(payloadConfigSource, /url:\s*kxdOsShareImage/);
assert.doesNotMatch(
  payloadConfigSource,
  /Content management for Kreate by Design/,
  "Remove legacy CMS-oriented admin meta description",
);

console.log("verify-kxd-os-admin-share: ok");
