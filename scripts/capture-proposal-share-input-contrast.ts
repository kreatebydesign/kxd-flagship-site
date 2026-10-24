/**
 * Visual + computed-style QA for proposal Share tab fields (dark + light).
 *   npx tsx scripts/capture-proposal-share-input-contrast.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = path.resolve(
  process.cwd(),
  "storage/qa-screenshots/proposal-share-input-contrast",
);

function shareTabHtml(): string {
  return `
  <div class="kxd-os-shell">
    <div class="kxd-os-page">
      <div class="proposal-builder-grid kxd-proposal-workspace">
        <div class="kxd-os-share-panel">
          <p class="kxd-os-meta">Mark as Sent — after you personally deliver the link</p>
          <label class="kxd-proposal-field-label">Delivery method</label>
          <select class="kxd-os-input kxd-os-select mark-sent-select">
            <option value="email">Email (manual)</option>
            <option value="copied-link">Copied link</option>
          </select>
          <label class="kxd-proposal-field-label">Delivered date</label>
          <input type="date" class="kxd-os-input mark-sent-date" value="2026-10-24" />
          <label class="kxd-proposal-field-label">Recipient (optional)</label>
          <input class="kxd-os-input mark-sent-recipient" value="cameron@example.com" placeholder="Recipient email" />
          <label class="kxd-proposal-field-label">Operator note (optional)</label>
          <textarea class="kxd-os-input kxd-os-textarea mark-sent-note" style="min-height:72px" placeholder="Optional note">Delivered via secure link.</textarea>
        </div>
        <div class="kxd-os-share-panel">
          <a class="kxd-os-share-link public-url" href="#">https://portal.kreatebydesign.com/proposal/demo-token-abc</a>
        </div>
        <input class="kxd-os-input identity-field" value="K&N Motors — Enterprise UX" />
        <input class="kxd-os-input identity-field-disabled" disabled value="Disabled field sample" />
      </div>
    </div>
  </div>`;
}

function buildHtml(theme: "dark" | "light"): string {
  const globalsPath = path.resolve(process.cwd(), "app/globals.css");
  const osPath = path.resolve(process.cwd(), "design-system/os/styles/kxd-os.css");
  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}" style="color-scheme:${theme}">
<head>
  <meta charset="utf-8"/>
  <link rel="stylesheet" href="file://${globalsPath}"/>
  <link rel="stylesheet" href="file://${osPath}"/>
</head>
<body class="antialiased">${shareTabHtml()}</body>
</html>`;
}

type Sample = {
  selector: string;
  color: string;
  backgroundColor: string;
  opacity: string;
  webkitTextFill: string;
  placeholder: string;
  ratio: number;
};

function parseRgb(css: string): [number, number, number] | null {
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(fg: string, bg: string): number {
  const f = parseRgb(fg);
  const b = parseRgb(bg);
  if (!f || !b) return 0;
  const l1 = luminance(f);
  const l2 = luminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function sampleFields(page: import("playwright").Page): Promise<Sample[]> {
  const selectors = [
    ".mark-sent-select",
    ".mark-sent-date",
    ".mark-sent-recipient",
    ".mark-sent-note",
    ".identity-field",
    ".identity-field-disabled",
    ".public-url",
  ];
  const out: Sample[] = [];
  for (const selector of selectors) {
    const el = page.locator(selector).first();
    const color = await el.evaluate((node) => getComputedStyle(node).color);
    const backgroundColor = await el.evaluate((node) => getComputedStyle(node).backgroundColor);
    const opacity = await el.evaluate((node) => getComputedStyle(node).opacity);
    const webkitTextFill = await el.evaluate(
      (node) => getComputedStyle(node).getPropertyValue("-webkit-text-fill-color") || "n/a",
    );
    let placeholder = "n/a";
    if (selector.includes("recipient") || selector.includes("note")) {
      placeholder = await el.evaluate((node) => {
        const p = getComputedStyle(node, "::placeholder");
        return p.color || "n/a";
      });
    }
    out.push({
      selector,
      color,
      backgroundColor,
      opacity,
      webkitTextFill,
      placeholder,
      ratio: contrastRatio(color, backgroundColor),
    });
  }
  return out;
}

const legacyInputStyle =
  "width:100%;border:1px solid var(--kxd-os-line,#e2d8c8);background:var(--kxd-os-paper,#fffdf8);border-radius:2px;padding:0.65rem 0.75rem;font:inherit";

function legacyHtml(theme: "dark" | "light"): string {
  const globalsPath = path.resolve(process.cwd(), "app/globals.css");
  const osPath = path.resolve(process.cwd(), "design-system/os/styles/kxd-os.css");
  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}" style="color-scheme:${theme}">
<head>
  <meta charset="utf-8"/>
  <link rel="stylesheet" href="file://${globalsPath}"/>
  <link rel="stylesheet" href="file://${osPath}"/>
</head>
<body class="antialiased">
  <div class="kxd-os-shell">
    <div class="kxd-proposal-workspace kxd-os-share-panel">
      <input class="kxd-os-input legacy-no-color" style="${legacyInputStyle}" value="Legacy paper field" />
      <input class="kxd-os-input legacy-no-color-ph" style="${legacyInputStyle}" placeholder="Legacy placeholder" />
    </div>
  </div>
</body></html>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const report: Record<string, Sample[]> = {};

  for (const theme of ["dark", "light"] as const) {
    const legacyPath = path.join(OUT_DIR, `fixture-legacy-${theme}.html`);
    fs.writeFileSync(legacyPath, legacyHtml(theme), "utf8");
    const legacyPage = await browser.newPage({ viewport: { width: 1280, height: 400 } });
    await legacyPage.goto(`file://${legacyPath}`, { waitUntil: "networkidle" });
    await legacyPage.screenshot({
      path: path.join(OUT_DIR, `proposal-share-legacy-${theme}.png`),
      fullPage: true,
    });
    const legacyColor = await legacyPage.locator(".legacy-no-color").evaluate(
      (node) => getComputedStyle(node).color,
    );
    const legacyBg = await legacyPage.locator(".legacy-no-color").evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    const legacyRatio = contrastRatio(legacyColor, legacyBg);
    const legacyOk = legacyRatio >= 4.5;
    console.log(
      `\nLEGACY ${theme}: ratio=${legacyRatio.toFixed(2)} ${legacyOk ? "OK" : "FAIL"} color=${legacyColor} bg=${legacyBg}`,
    );
    if (!legacyOk) {
      throw new Error(`Legacy ${theme} field contrast below 4.5:1 (${legacyRatio.toFixed(2)})`);
    }
    await legacyPage.close();
  }

  for (const theme of ["dark", "light"] as const) {
    const htmlPath = path.join(OUT_DIR, `fixture-${theme}.html`);
    fs.writeFileSync(htmlPath, buildHtml(theme), "utf8");
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
    await page.screenshot({
      path: path.join(OUT_DIR, `proposal-share-fields-${theme}.png`),
      fullPage: true,
    });
    report[theme] = await sampleFields(page);
    await page.close();
  }
  await browser.close();

  const jsonPath = path.join(OUT_DIR, "computed-styles.json");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Wrote screenshots + ${jsonPath}`);
  for (const theme of ["dark", "light"] as const) {
    console.log(`\n${theme} theme contrast ratios (text vs field bg):`);
    for (const row of report[theme]) {
      const ok = row.ratio >= 4.5;
      console.log(
        `  ${ok ? "OK" : "FAIL"} ${row.selector}: ${row.ratio.toFixed(2)}  color=${row.color} bg=${row.backgroundColor}`,
      );
      if (!ok) {
        throw new Error(`${theme} ${row.selector} contrast below 4.5:1`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
