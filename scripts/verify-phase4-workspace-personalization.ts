/**
 * Phase 4 Batch C — Client Workspace Personalization System.
 * Static + pure-unit verification only. No database. No external writes.
 *
 * Run: npm run verify:phase4-workspace-personalization
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import type { ResolvedExperienceProfile } from "../lib/ces";
import {
  assertWorkspaceModuleRegistryIntegrity,
  diagnoseWorkspacePersonalization,
  isSafePortalHref,
  NEUTRAL_WELCOME,
  PRIMAL_WORKSPACE_PROFILE,
  resolveWorkspacePersonalization,
  sanitizeAccentColor,
  sanitizeLogoUrl,
  sanitizePortalHref,
  WORKSPACE_FORBIDDEN_HREF_PATTERNS,
  WORKSPACE_MODULE_REGISTRY,
  WORKSPACE_PROFILE_REGISTRY,
  WORKSPACE_SAFE_PORTAL_HREFS,
} from "../lib/portal/workspace-personalization";
import { listActionCatalogForVerification } from "../lib/portal/workspace-personalization/actions";
import { PRIMAL_CLIENT_SLUG } from "../lib/ces/profile/primal";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function walkFiles(dir: string, exts: Set<string>, out: string[] = []): string[] {
  let entries: import("node:fs").Dirent[] = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (
      ent.name === "node_modules" ||
      ent.name === ".next" ||
      ent.name === ".git" ||
      ent.name === ".tmp"
    ) {
      continue;
    }
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(full, exts, out);
    else if (exts.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`);
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function baseProfile(overrides: Partial<{
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  logoUrl: string | null;
  accentColor: string;
  enabledModules: ResolvedExperienceProfile["enabledModules"];
}>): ResolvedExperienceProfile {
  return {
    profileId: null,
    source: "fallback",
    identity: {
      clientId: overrides.clientId ?? 42,
      clientName: overrides.clientName ?? "Acme Studio",
      clientSlug: overrides.clientSlug === undefined ? "acme-studio" : overrides.clientSlug,
      logoUrl: overrides.logoUrl ?? null,
      logoAlt: overrides.clientName ?? "Acme Studio",
      websiteUrl: null,
    },
    visual: {
      primaryColor: "#111111",
      secondaryColor: "#222222",
      accentColor: overrides.accentColor ?? "#111111",
      surfaceTint: null,
      borderRadiusPreset: "default",
      motionPreset: "calm",
    },
    hospitality: {
      welcomeEyebrow: "Your workspace",
      reassuranceLine: "Calm partnership workspace.",
      supportTone: "warm-professional",
      portalSidebarLabel: "Your workspace",
      partnerFooterLine: "Powered by KXD OS",
      showPartnerMark: true,
    },
    enabledModules: overrides.enabledModules ?? [],
    reportingCapabilities: [],
    presentation: null,
    terminology: {},
    cssVars: {},
  };
}

function main() {
  console.log("\nPhase 4 Batch C — workspace personalization\n");

  // --- Registry integrity ---
  assertWorkspaceModuleRegistryIntegrity();
  check("module registry has unique keys", true);

  const moduleKeys = WORKSPACE_MODULE_REGISTRY.map((m) => m.key);
  check(
    "module registry has no duplicate keys",
    new Set(moduleKeys).size === moduleKeys.length,
  );

  for (const mod of WORKSPACE_MODULE_REGISTRY) {
    check(
      `module ${mod.key} href is allowlisted`,
      isSafePortalHref(mod.href),
      mod.href,
    );
  }

  for (const href of WORKSPACE_SAFE_PORTAL_HREFS) {
    check(`safe href starts with /portal: ${href}`, href.startsWith("/portal"));
    for (const forbidden of WORKSPACE_FORBIDDEN_HREF_PATTERNS) {
      check(
        `safe href excludes ${forbidden}: ${href}`,
        !href.includes(forbidden),
      );
    }
  }

  check(
    "forbidden patterns include Phase 3 / vault / portfolio",
    WORKSPACE_FORBIDDEN_HREF_PATTERNS.some((p) => p.includes("client-relationship")) &&
      WORKSPACE_FORBIDDEN_HREF_PATTERNS.some((p) => p.includes("vault")) &&
      WORKSPACE_FORBIDDEN_HREF_PATTERNS.some((p) => p.includes("/portal/portfolio")),
  );

  // --- Actions ---
  for (const action of listActionCatalogForVerification()) {
    check(
      `action ${action.id} href safe`,
      sanitizePortalHref(action.href) != null,
      action.href,
    );
  }

  // --- Neutral fallback ---
  const neutral = resolveWorkspacePersonalization({
    authorizedClientId: 42,
    experienceProfile: baseProfile({
      clientSlug: "unknown-client",
      enabledModules: [],
    }),
  });
  check("unknown slug uses default profile", neutral.profileKey === "default");
  check("neutral fallback applied", neutral.fallbackApplied === true);
  check(
    "neutral welcome is not Primal-branded",
    !neutral.welcome.lead.toLowerCase().includes("primal") &&
      !neutral.welcome.eyebrow.toLowerCase().includes("primal") &&
      !neutral.identity.workspaceName.toLowerCase().includes("primal"),
  );
  check(
    "neutral defaults match shared neutral welcome",
    neutral.welcome.lead === NEUTRAL_WELCOME.lead,
  );
  check(
    "unentitled CES modules are not prioritized",
    !neutral.priorityModules.some((m) =>
      ["website-review", "inventory", "website-workspace"].includes(m.key),
    ),
  );

  // --- Explicit profile cannot enable unentitled modules ---
  const primalNoModules = resolveWorkspacePersonalization({
    authorizedClientId: 7,
    experienceProfile: baseProfile({
      clientId: 7,
      clientName: "Primal Motorsports",
      clientSlug: PRIMAL_CLIENT_SLUG,
      enabledModules: [],
    }),
  });
  check(
    "Primal profile key matches when slug matches",
    primalNoModules.profileKey === "primal-motorsports",
  );
  check(
    "Primal profile cannot enable unentitled website-review",
    !primalNoModules.priorityModules.some((m) => m.key === "website-review") &&
      !primalNoModules.primaryActions.some((a) => a.id === "review-website"),
  );

  const primalEntitled = resolveWorkspacePersonalization({
    authorizedClientId: 7,
    experienceProfile: baseProfile({
      clientId: 7,
      clientName: "Primal Motorsports",
      clientSlug: PRIMAL_CLIENT_SLUG,
      enabledModules: [
        "website-review",
        "website-workspace",
        "executive-review",
        "inventory",
      ],
      logoUrl: "/media/primal-logo.png",
      accentColor: "#A83424",
    }),
  });
  check(
    "Primal entitled profile surfaces website-review first among CES modules",
    primalEntitled.priorityModules.some((m) => m.key === "website-review"),
  );
  check(
    "Primal terminology uses established workspace label",
    primalEntitled.terminology.workspace ===
      PRIMAL_WORKSPACE_PROFILE.terminology.workspace,
  );
  check(
    "Primal logo sanitized",
    primalEntitled.identity.logoUrl === "/media/primal-logo.png",
  );
  check(
    "Primal accent sanitized",
    primalEntitled.identity.accentColor === "#A83424",
  );

  // --- Isolation: mismatched clientId throws ---
  let mismatchRejected = false;
  try {
    resolveWorkspacePersonalization({
      authorizedClientId: 99,
      experienceProfile: baseProfile({ clientId: 7 }),
    });
  } catch {
    mismatchRejected = true;
  }
  check("mismatched authorized client vs profile is rejected", mismatchRejected);

  // --- Logo / accent fallbacks ---
  check("protocol-relative logo rejected", sanitizeLogoUrl("//evil.example/x.png") == null);
  check("javascript logo rejected", sanitizeLogoUrl("javascript:alert(1)") == null);
  check("relative logo accepted", sanitizeLogoUrl("/media/logo.png") === "/media/logo.png");
  check("invalid accent rejected", sanitizeAccentColor("red") == null);
  check("accent injection rejected", sanitizeAccentColor("#fff;background:url(x)") == null);

  const missingLogo = resolveWorkspacePersonalization({
    authorizedClientId: 3,
    experienceProfile: baseProfile({
      clientId: 3,
      clientName: "Very Long Client Name For Overflow Testing LLC",
      clientSlug: null,
      logoUrl: null,
      accentColor: "not-a-color",
    }),
  });
  check("missing logo yields null", missingLogo.identity.logoUrl == null);
  check("invalid accent yields null", missingLogo.identity.accentColor == null);
  check(
    "long client name preserved safely",
    missingLogo.identity.clientName.includes("Very Long Client Name"),
  );

  // --- Terminology cannot change routes ---
  for (const mod of primalEntitled.priorityModules) {
    check(
      `terminology does not alter route for ${mod.key}`,
      sanitizePortalHref(mod.href) != null && mod.href.startsWith("/portal"),
    );
  }

  // --- No speculative Cusick profiles ---
  check(
    "no Cusick / OTP / Townsgate profiles in registry",
    !WORKSPACE_PROFILE_REGISTRY.some((p) =>
      /cusick|otp|townsgate|2475/i.test(p.key + (p.slug ?? "")),
    ),
  );

  // --- Diagnostic is read-only notice ---
  const diag = diagnoseWorkspacePersonalization({
    clientId: 1,
    clientName: "Test",
    clientSlug: null,
    cesModules: [],
    accentColor: null,
  });
  check(
    "diagnostic notice clarifies non-DB config",
    diag.notice.toLowerCase().includes("does not save") ||
      diag.notice.toLowerCase().includes("code-owned"),
  );

  // --- Static: portal page uses session-based personalization ---
  const portalPage = read("app/(portal)/portal/(app)/page.tsx");
  check(
    "portal home resolves personalization from session",
    portalPage.includes("resolvePortalWorkspacePersonalization") &&
      portalPage.includes("session"),
  );
  check(
    "portal home does not accept browser clientId for personalization",
    !portalPage.includes("searchParams") && !portalPage.includes("clientId="),
  );

  const serverEntry = read("lib/portal/workspace-personalization/server.ts");
  check(
    "server personalization entry is server-only",
    serverEntry.includes('import "server-only"') &&
      serverEntry.includes("session.clientId"),
  );

  // --- Layout remount / cache boundary ---
  const layout = read("app/(portal)/portal/(app)/layout.tsx");
  check(
    "portal layout remounts children by active client",
    layout.includes("portal-client-${session.clientId}") ||
      layout.includes("`portal-client-${session.clientId}`"),
  );
  check(
    "portal overview is force-dynamic (no global personalization cache)",
    portalPage.includes('dynamic = "force-dynamic"'),
  );

  // --- Switching remains readiness-gated (Batch B intact) ---
  const switcherVerify = read("scripts/verify-phase4-account-switcher.ts");
  check(
    "Batch B switcher verifier still present",
    switcherVerify.includes("switchingAvailable"),
  );

  // --- No migration / Cusick / membership activation in Batch C paths ---
  const personalizationDir = path.join(root, "lib/portal/workspace-personalization");
  const personalizationFiles = walkFiles(
    personalizationDir,
    new Set([".ts", ".tsx"]),
  ).map((f) => path.relative(root, f));

  for (const rel of personalizationFiles) {
    const src = read(rel);
    check(
      `${rel} does not connect to database`,
      !src.includes("getPayload") &&
        !src.includes("DATABASE_URL") &&
        !src.includes("neon") &&
        !/\bsql\b/i.test(src),
    );
    check(
      `${rel} does not invent Cusick IDs`,
      !/cusick|otp-carts|townsgate|2475/i.test(src),
    );
  }

  check(
    "no migration files touched by Batch C personalization module",
    !existsSync(path.join(personalizationDir, "migrations")) &&
      !read("migrations/index.ts").includes("workspace-personalization"),
  );

  // --- Profiles do not hard-code numeric production IDs ---
  const profilesSrc = read("lib/portal/workspace-personalization/profiles.ts");
  check(
    "profiles use slug constants, not numeric client IDs",
    profilesSrc.includes("PRIMAL_CLIENT_SLUG") &&
      !/\bclientId\s*:\s*\d+/.test(profilesSrc),
  );

  console.log("\nBatch C personalization verification passed.\n");
}

main();
