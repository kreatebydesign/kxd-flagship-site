/**
 * Shared client-workspace identity — pure unit checks.
 * Run: npx tsx scripts/verify-client-workspace-identity.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ResolvedExperienceProfile } from "../lib/ces";
import { getExecutivePresentation } from "../lib/ces/executive-performance/presentation";
import {
  PRIVATE_KXD_WORKSPACE_LABEL,
  resolveClientWorkspaceIdentity,
} from "../lib/portal/workspace-identity";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`);
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function baseProfile(
  overrides: Partial<{
    clientName: string;
    clientSlug: string;
    logoUrl: string | null;
    portalSidebarLabel: string;
    websiteUrl: string | null;
  }> = {},
): ResolvedExperienceProfile {
  const clientName = overrides.clientName ?? "Acme Studio";
  const clientSlug = overrides.clientSlug ?? "acme-studio";
  const presentation = getExecutivePresentation(clientSlug);
  return {
    profileId: null,
    source: "fallback",
    identity: {
      clientId: 1,
      clientName,
      clientSlug,
      logoUrl: overrides.logoUrl ?? presentation?.logoSrc ?? null,
      logoAlt: presentation?.logoAlt ?? clientName,
      websiteUrl: overrides.websiteUrl ?? null,
    },
    visual: {
      primaryColor: "#111111",
      secondaryColor: "#222222",
      accentColor: "#111111",
      surfaceTint: null,
      borderRadiusPreset: "default",
      motionPreset: "calm",
    },
    hospitality: {
      welcomeEyebrow: "Your workspace",
      reassuranceLine: "Calm partnership workspace.",
      supportTone: "warm-professional",
      portalSidebarLabel: overrides.portalSidebarLabel ?? clientName,
      partnerFooterLine: "Powered by KXD OS",
      showPartnerMark: true,
    },
    enabledModules: [],
    reportingCapabilities: [],
    presentation,
    terminology: {},
    cssVars: {},
  };
}

function main() {
  console.log("\nClient workspace identity\n");

  const shell = read("components/client-hq/ClientHqShell.tsx");
  const component = read("components/portal/ClientWorkspaceIdentity.tsx");
  const resolver = read("lib/portal/workspace-identity.ts");

  check("shell uses ClientWorkspaceIdentity", shell.includes("ClientWorkspaceIdentity"));
  check("shell uses resolveClientWorkspaceIdentity", shell.includes("resolveClientWorkspaceIdentity"));
  check("component exports ClientWorkspaceIdentity", component.includes("export function ClientWorkspaceIdentity"));
  check("canonical label constant exists", resolver.includes("PRIVATE_KXD_WORKSPACE_LABEL"));

  const cmm = resolveClientWorkspaceIdentity(
    baseProfile({
      clientName: "Cusick Morgan Motorsports",
      clientSlug: "cusick-morgan-motorsports",
      portalSidebarLabel: "Cusick Morgan Motorsports",
    }),
  );
  check("CMM name", cmm.clientName === "Cusick Morgan Motorsports");
  check("CMM logo from presentation registry", cmm.logoUrl === "/migrated-assets/logos/cusick-morgan.svg");
  check("CMM workspace label", cmm.workspaceLabel === PRIVATE_KXD_WORKSPACE_LABEL);

  const otp = resolveClientWorkspaceIdentity(
    baseProfile({
      clientName: "On Track Performance",
      clientSlug: "otp",
      websiteUrl: "https://on-track-performance.com",
    }),
  );
  check("OTP logo from presentation registry", otp.logoUrl === "/migrated-assets/logos/otp.svg");
  check("OTP website preserved", otp.websiteUrl === "https://on-track-performance.com");
  check("OTP workspace label", otp.workspaceLabel === PRIVATE_KXD_WORKSPACE_LABEL);

  const carts = resolveClientWorkspaceIdentity(
    baseProfile({
      clientName: "OTP Carts",
      clientSlug: "otp-carts",
    }),
  );
  check("OTP Carts name-only (no fabricated logo)", carts.logoUrl === null);
  check("OTP Carts workspace label", carts.workspaceLabel === PRIVATE_KXD_WORKSPACE_LABEL);

  const townsgate = resolveClientWorkspaceIdentity(
    baseProfile({
      clientName: "2475 Townsgate",
      clientSlug: "2475-townsgate",
    }),
  );
  check("Townsgate name-only (no fabricated logo)", townsgate.logoUrl === null);
  check("Townsgate workspace label", townsgate.workspaceLabel === PRIVATE_KXD_WORKSPACE_LABEL);

  const primal = resolveClientWorkspaceIdentity(
    baseProfile({
      clientName: "Primal Motorsports",
      clientSlug: "primal-motorsports",
      portalSidebarLabel: "Partnership workspace",
    }),
  );
  check("Primal keeps presentation logo", primal.logoUrl === "/migrated-assets/logos/primal.svg");
  check(
    "Primal keeps distinct workspace eyebrow",
    primal.workspaceLabel === "Private Partnership Workspace",
  );

  const css = read("design-system/ces/styles/kxd-ces.css");
  check("identity-stack chrome exists", css.includes(".kxd-ces-identity-stack"));
  check("switcher active treatment strengthened", css.includes("kxd-ces-account-switcher__option--active"));

  console.log("\nAll client-workspace-identity checks passed.\n");
}

main();
