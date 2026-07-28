/**
 * Client Resource Directory — Batch A (Operator Visibility).
 * Static verification only — no DB writes, notifications, or migrations.
 *
 * Run: npm run verify:client-resource-directory
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  buildClientResourceDirectory,
  buildClientResourceDirectoryFromRecords,
  CLIENT_RESOURCE_DIRECTORY_DISCLOSURE,
  evaluateSafeHttpsUrl,
} from "../lib/infrastructure/client-resource-directory";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function walkTs(dir: string, out: string[] = []): string[] {
  let entries: import("node:fs").Dirent[] = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (["node_modules", ".next", ".git", ".tmp"].includes(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTs(full, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(full);
  }
  return out;
}

function entryById(directory: ReturnType<typeof buildClientResourceDirectory>, id: string) {
  for (const category of directory.categories) {
    const found = category.entries.find((entry) => entry.id === id);
    if (found) return found;
  }
  return null;
}

function main() {
  console.log("\nClient Resource Directory — Batch A verification\n");

  assert.equal(evaluateSafeHttpsUrl(null).ok, false);
  assert.equal(
    (evaluateSafeHttpsUrl(null) as { reason: string }).reason,
    "missing",
  );

  const httpsOk = evaluateSafeHttpsUrl("https://otpcarts.com/");
  assert.equal(httpsOk.ok, true);
  if (httpsOk.ok) {
    assert.equal(httpsOk.href, "https://otpcarts.com");
  }
  console.log("  ✔ HTTPS acceptance");

  assert.equal(
    (evaluateSafeHttpsUrl("http://example.com") as { reason: string }).reason,
    "unsafe_protocol",
  );
  assert.equal(
    (evaluateSafeHttpsUrl("javascript:alert(1)") as { reason: string }).reason,
    "unsafe_protocol",
  );
  assert.equal(
    (evaluateSafeHttpsUrl("data:text/html,hi") as { reason: string }).reason,
    "unsafe_protocol",
  );
  assert.equal(
    (evaluateSafeHttpsUrl("file:///etc/passwd") as { reason: string }).reason,
    "unsafe_protocol",
  );
  console.log("  ✔ HTTP, JavaScript, data, file, and other protocol rejection");

  assert.equal(
    (evaluateSafeHttpsUrl("https://user:pass@example.com/path") as { reason: string })
      .reason,
    "credentials",
  );
  console.log("  ✔ embedded-credential rejection");

  assert.equal(
    (
      evaluateSafeHttpsUrl("https://example.com/callback?access_token=abc") as {
        reason: string;
      }
    ).reason,
    "secret",
  );
  assert.equal(
    (
      evaluateSafeHttpsUrl("https://example.com/x#api_key=secret") as {
        reason: string;
      }
    ).reason,
    "secret",
  );
  assert.equal(
    (
      evaluateSafeHttpsUrl("https://example.com/x?signed=1&sig=deadbeef") as {
        reason: string;
      }
    ).reason,
    "secret",
  );
  assert.equal(
    (
      evaluateSafeHttpsUrl("postgres://user:pass@db.example.com/app") as {
        reason: string;
      }
    ).reason,
    "secret",
  );
  console.log("  ✔ secret query, fragment, and credential-like rejection");

  const dirGithub = buildClientResourceDirectory({
    githubRepo: "https://github.com/kreatebydesign/kxd-flagship-site",
    vercelProject: "https://vercel.com/kxd/kxd-flagship-site",
  });
  const github = entryById(dirGithub, "github-repo");
  const vercel = entryById(dirGithub, "vercel-project");
  assert.equal(github?.href, "https://github.com/kreatebydesign/kxd-flagship-site");
  assert.equal(vercel?.href, "https://vercel.com/kxd/kxd-flagship-site");

  const dirBlockedHost = buildClientResourceDirectory({
    githubRepo: "https://gitlab.com/org/repo",
    vercelProject: "https://evil.example/vercel",
  });
  assert.equal(entryById(dirBlockedHost, "github-repo")?.href, null);
  assert.equal(entryById(dirBlockedHost, "github-repo")?.state, "recorded");
  assert.equal(entryById(dirBlockedHost, "vercel-project")?.href, null);
  assert.match(
    String(entryById(dirBlockedHost, "vercel-project")?.note),
    /allowlist/i,
  );

  const dirPlain = buildClientResourceDirectory({
    githubRepo: "kreatebydesign/kxd-flagship-site",
    vercelProject: "kxd-flagship-site",
  });
  assert.equal(entryById(dirPlain, "github-repo")?.kind, "text");
  assert.equal(entryById(dirPlain, "github-repo")?.href, null);
  assert.equal(entryById(dirPlain, "vercel-project")?.kind, "text");
  console.log("  ✔ GitHub and Vercel host allowlisting + plain-text fallback");

  const dirSc = buildClientResourceDirectory({
    searchConsoleSiteUrl: "sc-domain:otpcarts.com",
  });
  const sc = entryById(dirSc, "search-console-property");
  assert.equal(sc?.kind, "text");
  assert.equal(sc?.href, null);
  assert.equal(sc?.displayValue, "sc-domain:otpcarts.com");
  console.log("  ✔ sc-domain: plain-text handling");

  const dirDup = buildClientResourceDirectory({
    productionUrl: "https://otpcarts.com/",
    companyWebsite: "https://otpcarts.com",
  });
  assert.ok(entryById(dirDup, "production-url"));
  assert.equal(entryById(dirDup, "company-website"), null);
  assert.match(String(entryById(dirDup, "production-url")?.note), /Matches company website/i);
  console.log("  ✔ duplicate website handling");

  const dirMissing = buildClientResourceDirectory({});
  assert.equal(entryById(dirMissing, "production-url")?.state, "missing");
  assert.equal(entryById(dirMissing, "preview-website")?.state, "missing");
  assert.equal(dirMissing.hasAnyRecordedValue, false);

  const dirInvalid = buildClientResourceDirectory({
    productionUrl: "not a url",
    stagingUrl: "ftp://files.example.com",
  });
  assert.equal(entryById(dirInvalid, "production-url")?.state, "invalid");
  assert.equal(entryById(dirInvalid, "preview-website")?.state, "invalid");
  console.log("  ✔ missing and invalid URLs");

  const dirAccess = buildClientResourceDirectory({
    websiteAccess: null,
    hostingAccess: true,
    analyticsAccess: false,
  });
  const websiteAccess = dirAccess.softAccessSignals.find((s) => s.id === "website-access");
  const hostingAccess = dirAccess.softAccessSignals.find((s) => s.id === "hosting-access");
  const analyticsAccess = dirAccess.softAccessSignals.find((s) => s.id === "analytics-access");
  assert.equal(websiteAccess?.state, "unknown");
  assert.equal(hostingAccess?.state, "reported_yes");
  assert.equal(analyticsAccess?.state, "reported_no");
  assert.match(String(hostingAccess?.detail), /not verified/i);
  assert.doesNotMatch(JSON.stringify(dirAccess), /verified ownership|KXD control|working access/i);
  console.log("  ✔ unknown access states and soft language");

  const helpers = read("lib/infrastructure/client-resource-directory.ts");
  assert.doesNotMatch(
    helpers,
    /record\.(internalNotes|renewalNotes|nameservers)|client\.notes|loginNotesReference|apiIntegrations|importantLinks|accountOwner/,
  );
  assert.doesNotMatch(helpers, /process\.env/);
  const serialized = JSON.stringify(
    buildClientResourceDirectoryFromRecords({
      record: {
        productionUrl: "https://example.com",
        internalNotes: "password=supersecret",
        renewalNotes: "api_key=abc",
        nameservers: "ns1.example.com",
        loginNotesReference: "1Password vault",
      },
      client: {
        companyWebsite: "https://example.com",
        notes: "confidential",
      },
      onboardingAccess: { hostingAccess: true },
    }),
  );
  assert.doesNotMatch(serialized, /supersecret|api_key=abc|1Password|confidential|ns1\.example/);
  console.log("  ✔ confidential-field exclusion");

  const detail = read(
    "components/admin/operations/infrastructure/InfrastructureClientScreen.tsx",
  );
  assert.match(detail, /Client resource directory/);
  assert.match(detail, /target="_blank"/);
  assert.match(detail, /rel="noopener noreferrer"/);
  assert.match(detail, /directory\.disclosure/);
  assert.match(detail, /clientResourceDirectory/);
  assert.match(helpers, /not a credential vault/i);
  assert.match(CLIENT_RESOURCE_DIRECTORY_DISCLOSURE, /not a credential vault/i);
  assert.doesNotMatch(detail, /dangerouslySetInnerHTML/);
  console.log("  ✔ safe external-link attributes and UI wiring");

  const dataSrc = read("lib/infrastructure/data.ts");
  const typesSrc = read("lib/infrastructure/types.ts");
  const pkg = read("package.json");
  const currentState = read("docs/KXD-OS-CURRENT-STATE.md");
  const founding = read("docs/KXD-OS-V1-FOUNDING-CLIENT-EARLY-ACCESS.md");

  assert.match(dataSrc, /clientResourceDirectory/);
  assert.match(dataSrc, /buildClientResourceDirectoryFromRecords/);
  assert.doesNotMatch(
    dataSrc.slice(dataSrc.indexOf("buildClientResourceDirectoryFromRecords")),
    /ensureClientInfrastructureRecords/,
  );
  assert.match(typesSrc, /clientResourceDirectory/);
  assert.match(pkg, /"verify:client-resource-directory"/);
  assert.match(currentState, /Client Resource Directory/);
  assert.match(founding, /Client Resource Directory/);
  assert.match(CLIENT_RESOURCE_DIRECTORY_DISCLOSURE, /not a credential vault/i);
  console.log("  ✔ loader, types, package script, and docs wiring");

  const portalHits = walkTs(path.join(root, "components/ces")).concat(
    walkTs(path.join(root, "lib/ces")),
    walkTs(path.join(root, "lib/portal")),
    walkTs(path.join(root, "app")),
  );
  for (const file of portalHits) {
    if (!file.includes(`${path.sep}portal${path.sep}`) && !file.includes(`${path.sep}ces${path.sep}`)) {
      continue;
    }
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(src, /client-resource-directory|ClientResourceDirectory|Client resource directory/);
  }
  console.log("  ✔ no portal / CES exposure");

  const migrations = readdirSync(path.join(root, "migrations")).filter((n) =>
    n.endsWith(".ts"),
  );
  assert.ok(!migrations.some((n) => /client.?resource.?directory|resource.?hub/i.test(n)));
  assert.doesNotMatch(read("migrations/index.ts"), /client.?resource.?directory|resource.?hub/i);

  const scanned = [
    "lib/infrastructure/client-resource-directory.ts",
    "lib/infrastructure/data.ts",
    "lib/infrastructure/types.ts",
    "components/admin/operations/infrastructure/InfrastructureClientScreen.tsx",
  ];
  const forbidden = [
    "Account" + "Switcher",
    "switch" + "ActiveClient",
    "Combined" + "Portfolio",
    "portal/" + "portfolio",
    "RESEND" + "_API_KEY",
    "nodemailer",
    "createTransport",
    "migrate:production",
    "Credential" + " Vault",
  ];
  for (const rel of scanned) {
    const src = read(rel);
    for (const token of forbidden) {
      assert.ok(!src.includes(token), `${rel} must not contain ${token}`);
    }
    assert.doesNotMatch(src, /\bhas verified ownership\b/i);
    assert.doesNotMatch(src, /\bconfirmed ownership\b/i);
    // New directory helpers must not introduce runtime network calls.
    if (rel.endsWith("client-resource-directory.ts")) {
      assert.doesNotMatch(src, /\bfetch\s*\(/);
    }
  }
  console.log("  ✔ no migrations, Phase 4 Batch B, external actions, or verified-ownership claims");

  const categoryIds = buildClientResourceDirectory({}).categories.map((c) => c.id);
  assert.deepEqual(categoryIds, [
    "website_preview",
    "hosting_deployment",
    "domain_dns",
    "analytics_search",
    "advertising",
    "communications_email",
    "repository_development",
  ]);
  console.log("  ✔ evidence-backed categories only");

  console.log("\nClient Resource Directory Batch A verification passed.\n");
}

main();
