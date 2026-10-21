/**
 * Visual fixture for staff guided work instruction formatting (no auth).
 * Renders representative Work #46-shaped content with production CSS classes.
 *
 *   npx tsx scripts/capture-staff-guided-work-formatting-fixture.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { resolveGuidedWorkBrief } from "../lib/staff/guided-work-content.ts";

const OUT_DIR = path.resolve(
  process.cwd(),
  "storage/qa-screenshots/staff-guided-work-formatting",
);

const legacySummary =
  "Set up your home Mac so you can work remotely with the studio.\n" +
  "1. Install Tailscale from the studio link\n" +
  "2. Sign in with your studio account\n" +
  "3. Enable Screen Sharing in System Settings\n" +
  "4. Confirm Matt can connect for a quick test";

const brief = resolveGuidedWorkBrief({
  summary: legacySummary,
  description: null,
  expectedOutcomeFromNotes: "You can securely reach studio systems from your home Mac.",
  hasStructuredDeliverables: true,
});

const deliverables = [
  "Install Tailscale",
  "Sign in with studio account",
  "Enable Screen Sharing",
  "Verify connection with Matt",
].map((title, i) => ({ title, i }));

function sectionHtml(): string {
  const instructions = brief.instructionBlocks
    .map(
      (block) =>
        `<p class="kxd-os-staff-my-work__prose kxd-os-staff-guided__instructions">${block.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");

  const deliverableList = deliverables
    .map(
      (d) => `
    <li class="kxd-os-staff-guided__deliverable">
      <label class="kxd-os-staff-guided__deliverable-label">
        <input type="checkbox" />
        <span class="kxd-os-staff-guided__deliverable-body">
          <span class="kxd-os-staff-guided__deliverable-title">
            <span class="kxd-os-staff-guided__deliverable-index">${d.i + 1}.</span>
            ${d.title} <span class="kxd-os-meta"> Required</span>
          </span>
        </span>
      </label>
    </li>`,
    )
    .join("");

  return `
  <div class="kxd-os-page--staff-guided-work" style="max-width:42rem;margin:2rem auto;padding:1rem;font-family:system-ui,sans-serif;">
    <p class="kxd-os-section__label">Expected outcome</p>
    <p class="kxd-os-staff-my-work__prose kxd-os-staff-guided__expected-outcome">${brief.expectedOutcome}</p>
    <div class="kxd-os-staff-guided__instructions-section">
      <p class="kxd-os-section__label">Instructions</p>
      <div class="kxd-os-staff-guided__instruction-blocks">${instructions}</div>
    </div>
    <p class="kxd-os-section__label" style="margin-top:1.5rem;">Deliverables</p>
    <ul class="kxd-os-staff-guided__deliverables">${deliverableList}</ul>
    <p class="kxd-os-section__label" style="margin-top:1.5rem;">Your progress</p>
    <textarea class="kxd-os-staff-guided__progress-input" rows="4" style="width:100%;">Started Tailscale install.</textarea>
  </div>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const cssPath = path.resolve(process.cwd(), "design-system/os/styles/kxd-os.css");
  const cssHref = `file://${cssPath}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><link rel="stylesheet" href="${cssHref}"/></head><body>${sectionHtml()}</body></html>`;
  const htmlPath = path.join(OUT_DIR, "fixture.html");
  fs.writeFileSync(htmlPath, html, "utf8");

  const browser = await chromium.launch();
  for (const [name, width, height] of [
    ["desktop-guided-work-sections", 1280, 900],
    ["mobile-guided-work-sections", 390, 844],
  ] as const) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
    await page.close();
  }
  await browser.close();
  console.log(`Screenshots written to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
