/**
 * KXD Signature Experience — static enforcement (no deploy).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function ok(label: string, pass: boolean): void {
  if (!pass) {
    console.error(`  ✘ ${label}`);
    process.exitCode = 1;
    return;
  }
  console.log(`  ✔ ${label}`);
}

const logoPath = path.join(ROOT, "public/migrated-assets/brand/kxd-logo-transparent.png");

console.log("\nKXD Signature Experience verification\n");

ok("official gold logo asset on disk", fs.existsSync(logoPath));

const brand = read("lib/ces/portal/brand-signature.ts");
ok("headline copy locked", brand.includes('KXD_SIGNATURE_HEADLINE = "Exceptional by Design."'));
ok("attribution copy locked", brand.includes("Designed & Developed by"));
ok("signature duration ~3.2s", brand.includes("KXD_SIGNATURE_EXPERIENCE_DURATION_MS = 3188"));

const session = read("lib/ces/portal/signature-session.ts");
ok("per-client session keys", session.includes("signatureStorageKey"));
ok("failsafe timeout", session.includes("KXD_SIGNATURE_FAILSAFE_MS"));
ok("reduced motion helper", session.includes("prefersReducedSignatureMotion"));

const experience = read("components/ces/portal/KxdSignatureExperience.tsx");
ok("uses official logo path constant", experience.includes("KXD_OFFICIAL_GOLD_LOGO_PATH"));
ok("failsafe timers", experience.includes("KXD_SIGNATURE_FAILSAFE_MS"));
ok("no duplicate client folders", !fs.existsSync(path.join(ROOT, "components/ces/portal/primal-signature")));

const arming = read("components/ces/portal/KxdSignatureArmingInline.tsx");
ok("arming script in layout chain", read("app/(portal)/portal/(app)/layout.tsx").includes("KxdSignatureArmingInline"));
ok("arming sets data-kxd-signature", arming.includes('data-kxd-signature'));

const shell = read("components/client-hq/ClientHqShell.tsx");
ok("Client HQ shell mounts KxdSignatureExperience", shell.includes("KxdSignatureExperience"));
ok("signature uses clientId", shell.includes("clientId={signatureClientId}"));
ok("operator preview disables signature", shell.includes("!operatorPreview"));
ok("sidebar uses KxdPortalBrandSignature", shell.includes("KxdPortalBrandSignature"));
ok("no Crafted by KXD in shell", !shell.toLowerCase().includes("crafted by"));

const signature = read("components/ces/portal/KxdPortalBrandSignature.tsx");
ok("attribution links kreatebydesign.com", brand.includes("https://www.kreatebydesign.com"));

const css = read("design-system/ces/styles/kxd-portal-brand-signature.css");
ok("arming veil CSS", css.includes('html[data-kxd-signature="arming"]'));
ok("experience isolated from client vars", css.includes(".kxd-signature-experience"));
ok("reduced motion block", css.includes("prefers-reduced-motion"));
ok("mobile attribution rule", css.includes("max-width: 960px"));

const ces = read("design-system/ces/styles/kxd-ces.css");
ok("CES imports signature stylesheet", ces.includes("kxd-portal-brand-signature.css"));

const primal = read("design-system/ces/styles/kxd-primal-portal.css");
ok("primal identity partner blue", primal.includes("kxd-ces-identity__partner"));
ok("primal active nav blue", primal.includes("inset 2px 0 0 #24aee8"));
ok("JB calendar colors unchanged in primal sheet", !primal.includes("2563EB") || !primal.includes("kxd-cal-type"));

const adminShell = read("components/admin/operations/shared/OperationsShell.tsx");
ok("admin operations shell excluded", !adminShell.includes("KxdSignatureExperience"));

const partnerLayout = read("app/(portal)/portal/(partner)/layout.tsx");
ok("partner portal excluded", !partnerLayout.includes("KxdSignatureExperience"));

ok("design system doc exists", fs.existsSync(path.join(ROOT, "design-system/ces/KXD-SIGNATURE-EXPERIENCE.md")));

const defaults = read("lib/ces/profile/defaults.ts");
ok("default partner footer uses signature copy", defaults.includes("KXD_PORTAL_ATTRIBUTION_COPY"));

if (process.exitCode === 1) {
  console.error("\nKXD Signature Experience verification failed.\n");
  process.exit(1);
}

console.log("\nKXD Signature Experience verification passed.\n");