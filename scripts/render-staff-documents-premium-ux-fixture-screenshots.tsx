/**
 * Offline visual fixtures for Staff Documents premium UX (no auth, no mutations).
 * Uses the same React presentation components + design-system CSS as production UI.
 *
 *   npx tsx scripts/render-staff-documents-premium-ux-fixture-screenshots.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { KXD_AGREEMENT_LOGO_PUBLIC_PATH } from "../lib/agreement-presentation/tokens.ts";
import {
  SAMPLE_NONBINDING_AGREEMENT_BODY,
  SAMPLE_NONBINDING_AGREEMENT_TITLE,
} from "../lib/staff-documents/constants.ts";
import { StaffDocumentReviewPane } from "../components/admin/operations/staff/StaffDocumentReviewPane.tsx";

const root = process.cwd();
const OUT_DIR = path.resolve(
  process.env.KXD_STAFF_DOC_QA_SCREENSHOT_DIR?.trim() ||
    path.join(root, "storage/qa-screenshots/pr111-staff-documents-premium-ux"),
);

const VIEWPORTS = [
  { label: "fixture-mobile-390", width: 390, height: 844 },
  { label: "fixture-tablet-768", width: 768, height: 1024 },
  { label: "fixture-desktop-1440", width: 1440, height: 900 },
] as const;

function readCss(...parts: string[]): string {
  return parts.map((p) => fs.readFileSync(path.join(root, p), "utf8")).join("\n");
}

function buildFixtureHtml(): string {
  const agreementCss = readCss("design-system/agreement/kxd-agreement-document.css");
  const staffCss = readCss("design-system/os/styles/kxd-staff-documents.css");
  const reviewMarkup = renderToStaticMarkup(
    <StaffDocumentReviewPane
      eyebrow="Employment agreement"
      title={SAMPLE_NONBINDING_AGREEMENT_TITLE}
      metaLine="Kreate by Design LLC · Version 3 · Assigned Oct 20, 2026"
      bodySnapshot={SAMPLE_NONBINDING_AGREEMENT_BODY}
      footerLabel="Staff agreement · Review in full before signing"
    />,
  );
  const signPanel = `
    <form class="kxd-os-card kxd-os-ops-card-padding kxd-staff-doc-detail__panel" style="max-width:44rem;margin:1rem auto;background:#1a1917;border:1px solid rgba(255,255,255,.08);padding:1rem;border-radius:2px;">
      <ol class="kxd-staff-doc-steps" aria-label="Signing steps">
        <li class="kxd-staff-doc-steps__item">1. Review agreement</li>
        <li class="kxd-staff-doc-steps__item kxd-staff-doc-steps__item--current">2. Complete signature</li>
      </ol>
      <fieldset class="kxd-staff-doc-sign-fieldset">
        <legend class="kxd-os-card__title" style="color:#f5f2eb;font-size:.95rem;">Electronic signature</legend>
        <label class="kxd-staff-doc-consent" for="fixture-authority">
          <input id="fixture-authority" type="checkbox" />
          <span class="kxd-os-meta" style="color:rgba(255,255,255,.65);">I am authorized to sign for the named party.</span>
        </label>
        <label class="kxd-staff-doc-consent" for="fixture-consent">
          <input id="fixture-consent" type="checkbox" />
          <span class="kxd-os-meta" style="color:rgba(255,255,255,.65);">I agree to electronic records and signatures.</span>
        </label>
      </fieldset>
    </form>`;

  const listFixture = `
    <section aria-label="Needs your attention" style="max-width:44rem;margin:0 auto 1rem;">
      <p style="color:rgba(255,255,255,.55);font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;">Needs your attention · 1</p>
      <div style="background:#1a1917;border:1px solid rgba(255,255,255,.08);border-radius:2px;">
        <ul class="kxd-staff-doc-list">
          <li class="kxd-staff-doc-list__item kxd-staff-doc-list__item--attention">
            <a class="kxd-staff-doc-list__link" href="#">
              <div class="kxd-staff-doc-list__main">
                <p class="kxd-staff-doc-list__title" style="color:#f5f2eb;">${SAMPLE_NONBINDING_AGREEMENT_TITLE}</p>
                <p class="kxd-staff-doc-list__meta">
                  <span>Employment agreement</span><span aria-hidden="true">·</span><span>Version 3</span><span aria-hidden="true">·</span><span>Assigned Oct 20, 2026</span>
                </p>
              </div>
              <div class="kxd-staff-doc-list__aside">
                <span style="font-size:.68rem;color:#c2aa72;">Signature required</span>
                <span class="kxd-staff-doc-list__cta">Review & sign</span>
              </div>
            </a>
          </li>
        </ul>
      </div>
    </section>`;

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <title>Staff Documents UX Fixture</title>
  <style>
    body { margin: 0; background: #121110; font-family: system-ui, sans-serif; padding: 1rem 0 2rem; }
    ${agreementCss}
    ${staffCss}
  </style>
</head>
<body>
  <div class="kxd-staff-doc-detail">
    ${listFixture}
    ${reviewMarkup}
    ${signPanel}
  </div>
  <img src="${KXD_AGREEMENT_LOGO_PUBLIC_PATH}" alt="" style="display:none" data-qa-logo-path />
</body>
</html>`;
}

async function main(): Promise<void> {
  assert.ok(fs.existsSync(path.join(root, "public", KXD_AGREEMENT_LOGO_PUBLIC_PATH.slice(1))));
  const html = buildFixtureHtml();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const htmlPath = path.join(OUT_DIR, "fixture.html");
  fs.writeFileSync(htmlPath, html);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: "load" });

  const logoVisible = await page.locator(".kxd-agreement-doc__logo").isVisible();
  assert.ok(logoVisible, "logo element visible in fixture");

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const file = path.join(OUT_DIR, `${viewport.label}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`[fixture QA] ${file}`);
  }

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const w = doc.clientWidth || window.innerWidth;
    return doc.scrollWidth - w;
  });
  assert.ok(Number.isFinite(overflow) && overflow <= 4, `fixture horizontal overflow ${overflow}px`);

  await browser.close();
  console.log("render-staff-documents-premium-ux-fixture-screenshots: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
