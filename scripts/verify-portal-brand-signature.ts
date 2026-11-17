/**
 * Client portal KXD brand signature — static verification (no deploy).
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

console.log("\nPortal brand signature verification\n");

ok("official gold logo asset on disk", fs.existsSync(logoPath));

const shell = read("components/client-hq/ClientHqShell.tsx");
ok("Client HQ shell mounts login intro", shell.includes("KxdPortalLoginIntro"));
ok("Client HQ shell uses brand signature", shell.includes("KxdPortalBrandSignature"));
ok("sidebar no longer uses KxdLogo partner mark", !shell.includes("kxd-ces-partner-mark"));

const signature = read("components/ces/portal/KxdPortalBrandSignature.tsx");
ok("attribution component uses shared URL constant", signature.includes("KXD_PORTAL_ATTRIBUTION_URL"));
ok("attribution component uses company constant", signature.includes("KXD_PORTAL_ATTRIBUTION_COMPANY"));
ok("attribution Designed & Developed copy", signature.includes("Designed &amp; Developed by"));

const brand = read("lib/ces/portal/brand-signature.ts");
ok("intro uses official logo path", brand.includes("kxd-logo-transparent.png"));
ok("intro session key", brand.includes("kxd-ces-portal-brand-intro-v1"));
ok("attribution links kreatebydesign.com", brand.includes("https://www.kreatebydesign.com"));

const intro = read("components/ces/portal/KxdPortalLoginIntro.tsx");
ok("intro respects reduced motion", intro.includes("prefers-reduced-motion"));

const css = read("design-system/ces/styles/kxd-portal-brand-signature.css");
ok("intro scoped under kxd-ces-app", css.includes(".kxd-ces-app .kxd-portal-intro"));
ok("intro duration under 1.5s", css.includes("0.98s"));
ok("mobile sidebar attribution rule", css.includes("max-width: 960px"));

const ces = read("design-system/ces/styles/kxd-ces.css");
ok("CES imports brand signature styles", ces.includes("kxd-portal-brand-signature.css"));

const defaults = read("lib/ces/profile/defaults.ts");
ok("default partner footer matches signature", defaults.includes("KXD_PORTAL_ATTRIBUTION_COPY"));

const adminShell = read("components/admin/operations/shared/OperationsShell.tsx");
ok("admin operations shell untouched", !adminShell.includes("KxdPortalLoginIntro"));

if (process.exitCode === 1) {
  console.error("\nPortal brand signature verification failed.\n");
  process.exit(1);
}

console.log("\nPortal brand signature verification passed.\n");