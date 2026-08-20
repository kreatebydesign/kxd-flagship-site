/**
 * Production-safe dual e-sign foundation checks (no DB / no sends).
 *   npx tsx scripts/verify-contract-signing-safety.ts
 */
import {
  containsInternalDraftBanner,
  toClientFacingContractBody,
} from "../lib/proposal-lifecycle/client-facing-contract.ts";
import { resolveAppPublicOrigin } from "../lib/app-url.ts";
import { buildLocalDeliveryPreview } from "../lib/proposal-lifecycle/delivery-preview.ts";
import {
  DEFAULT_LEGAL_DRAFT_NOTICE,
  DEFAULT_OPERATIONAL_DRAFT_NOTICE,
} from "../lib/proposal-builder/types.ts";

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean) {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log("\nContract signing safety verification\n");

const sampleBody = [
  DEFAULT_LEGAL_DRAFT_NOTICE,
  "",
  DEFAULT_OPERATIONAL_DRAFT_NOTICE,
  "",
  "AUTO-GENERATED DRAFT — internal review required. Not attorney-approved. Not sent.",
  "",
  "Website Care & Local Visibility — $250/month beginning at website launch.",
  "Governing Law: State of California. Venue: Los Angeles County.",
].join("\n");

check("raw body has internal banner", containsInternalDraftBanner(sampleBody));
const clientFacing = toClientFacingContractBody(sampleBody);
check("client-facing strips DRAFT FOR INTERNAL REVIEW", !clientFacing.includes("DRAFT FOR INTERNAL REVIEW"));
check("client-facing strips operational draft notice", !clientFacing.includes("Template and operational wording only"));
check("client-facing strips AUTO-GENERATED DRAFT", !clientFacing.includes("AUTO-GENERATED DRAFT"));
check("client-facing keeps commercial care language", clientFacing.includes("$250/month"));
check("client-facing keeps governing law", clientFacing.includes("California"));
check("sanitized body has no internal banner", !containsInternalDraftBanner(clientFacing));

const prevNodeEnv = process.env.NODE_ENV;
const prevSite = process.env.NEXT_PUBLIC_SITE_URL;
const prevServer = process.env.NEXT_PUBLIC_SERVER_URL;
const prevVercel = process.env.VERCEL;
const prevVercelUrl = process.env.VERCEL_URL;

const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = "production";
env.NEXT_PUBLIC_SITE_URL = "[SENSITIVE]";
env.NEXT_PUBLIC_SERVER_URL = "https://www.kreatebydesign.com";
delete env.VERCEL;
delete env.VERCEL_URL;
check(
  "production skips [SENSITIVE] SITE_URL and uses SERVER_URL",
  resolveAppPublicOrigin() === "https://www.kreatebydesign.com",
);

delete env.NEXT_PUBLIC_SITE_URL;
delete env.NEXT_PUBLIC_SERVER_URL;
const prodFallback = resolveAppPublicOrigin();
check(
  "production without env does not use localhost",
  !prodFallback.includes("localhost") && prodFallback.startsWith("https://"),
);

env.NEXT_PUBLIC_SERVER_URL = "https://www.kreatebydesign.com";
const prodExplicit = resolveAppPublicOrigin();
check(
  "production uses authoritative HTTPS domain",
  prodExplicit === "https://www.kreatebydesign.com",
);
check(
  "signing path uses production host",
  `${prodExplicit}/contract/example-token`.startsWith("https://www.kreatebydesign.com/contract/"),
);

// Ignore localhost env when NODE_ENV=production
env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
delete env.NEXT_PUBLIC_SERVER_URL;
const prodIgnoresLocalhostEnv = resolveAppPublicOrigin();
check(
  "production ignores localhost SITE_URL",
  !prodIgnoresLocalhostEnv.includes("localhost"),
);

env.NODE_ENV = "development";
delete env.VERCEL;
env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
const localDev = resolveAppPublicOrigin();
check("local development still resolves localhost", localDev === "http://localhost:3000");

const override = resolveAppPublicOrigin("https://portal.example.test");
check("explicit override wins", override === "https://portal.example.test");

if (prevNodeEnv !== undefined) env.NODE_ENV = prevNodeEnv;
else delete env.NODE_ENV;
if (prevSite !== undefined) env.NEXT_PUBLIC_SITE_URL = prevSite;
else delete env.NEXT_PUBLIC_SITE_URL;
if (prevServer !== undefined) env.NEXT_PUBLIC_SERVER_URL = prevServer;
else delete env.NEXT_PUBLIC_SERVER_URL;
if (prevVercel !== undefined) env.VERCEL = prevVercel;
else delete env.VERCEL;
if (prevVercelUrl !== undefined) env.VERCEL_URL = prevVercelUrl;
else delete env.VERCEL_URL;

const contractPreview = buildLocalDeliveryPreview({
  kind: "contract-signature-send",
  recipientName: "Client",
  recipientEmail: "client@example.com",
  subject: "Agreement",
  bodyText: "Sign here",
  secureUrl: "https://www.kreatebydesign.com/contract/raw-secret-token",
  rawToken: "raw-secret-token",
});
check(
  "contract prepare preview does not claim email sent",
  contractPreview.label.includes("no email sent") && !contractPreview.label.includes("SIMULATED LOCAL DELIVERY"),
);
check("preview redacts raw token from secure URL", !contractPreview.secureUrl.includes("raw-secret-token"));

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
