import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PORTAL_HOST } from "../lib/portal/constants";
import {
  NETWORK_HOST,
  NETWORK_ROOT_LOGIN_PATH,
  NETWORK_SHARE,
  isLinkPreviewCrawler,
  networkRootRedirectPath,
  networkRootResponseKind,
  networkShareCrawlerHtml,
  networkShareImageAbsoluteUrl,
} from "../lib/portal/network-root";

const root = process.cwd();
const middleware = readFileSync(path.join(root, "middleware.ts"), "utf8");
const ogPath = path.join(root, "public", NETWORK_SHARE.imagePath.replace(/^\//, ""));
const sourcePath = path.join(
  root,
  "public/migrated-assets/brand/kxd-network-private-access-invite-v5.png",
);

assert.equal(NETWORK_HOST, "network.kreatebydesign.com");
assert.equal(NETWORK_ROOT_LOGIN_PATH, "/portal/login?redirect=/portal/partner");
assert.equal(networkRootRedirectPath("/", NETWORK_HOST), NETWORK_ROOT_LOGIN_PATH);
assert.equal(networkRootRedirectPath("/", PORTAL_HOST), null);
assert.equal(networkRootRedirectPath("/", "kreatebydesign.com"), null);

assert.equal(networkRootResponseKind("/", NETWORK_HOST, "Mozilla/5.0"), "redirect");
assert.equal(
  networkRootResponseKind("/", NETWORK_HOST, "Twitterbot/1.0"),
  "share",
);
assert.equal(
  networkRootResponseKind("/", NETWORK_HOST, "facebookexternalhit/1.1"),
  "share",
);
assert.equal(
  networkRootResponseKind("/", PORTAL_HOST, "Twitterbot/1.0"),
  null,
);
assert.equal(isLinkPreviewCrawler("Slackbot-LinkExpanding 1.0"), true);

const html = networkShareCrawlerHtml();
assert.match(html, /property="og:title" content="KXD Network — Private Access"/);
assert.match(
  html,
  /property="og:description" content="A private KXD partner room for trusted introductions and real opportunity."/,
);
assert.match(html, /name="twitter:card" content="summary_large_image"/);
assert.equal(
  networkShareImageAbsoluteUrl(),
  "https://network.kreatebydesign.com/migrated-assets/brand/kxd-network-private-access-og-1200x630.png",
);
assert.match(html, /property="og:image" content="https:\/\/network\.kreatebydesign\.com\/migrated-assets\/brand\/kxd-network-private-access-og-1200x630\.png"/);
assert.doesNotMatch(html, /<script/i);

assert.match(middleware, /networkRootResponseKind/);
assert.match(middleware, /networkShareCrawlerHtml/);
assert.match(middleware, /networkRootKind === "redirect"/);

assert.equal(existsSync(sourcePath), true);
assert.equal(existsSync(ogPath), true);

async function assertOgDimensions() {
  const og = await sharp(ogPath).metadata();
  assert.equal(og.width, 1200);
  assert.equal(og.height, 630);
}

assertOgDimensions()
  .then(() => {
    console.log("verify-network-root-redirect: ok");
    console.log("inspect-network-share-metadata:");
    console.log(html);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
