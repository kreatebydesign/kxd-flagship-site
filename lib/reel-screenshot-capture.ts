/**
 * lib/reel-screenshot-capture.ts
 * KXD Creative Engine — Phase 5A
 *
 * Playwright-based website screenshot capture for reel storyboard generation.
 *
 * Captures 5 sections of the target website:
 *   1. hero         — first viewport (above the fold)
 *   2. services     — ~25% scroll (features/services section)
 *   3. testimonials — ~55% scroll (social proof / reviews)
 *   4. cta-footer   — ~80% scroll (CTA section)
 *   5. full-brand   — full-page screenshot
 *
 * Requirements (local dev):
 *   npx playwright install chromium
 *
 * Note: Playwright browser binaries are not available in Vercel serverless
 * without additional configuration. Use a Browserless endpoint or
 * playwright-aws-lambda for production deployment.
 */

export interface CapturedScreenshot {
  section:    "hero" | "services" | "testimonials" | "cta-footer" | "full-brand";
  label:      string;
  filename:   string;
  buffer:     Buffer;
  mimeType:   "image/png";
}

export interface ScreenshotCaptureResult {
  success:     boolean;
  screenshots: CapturedScreenshot[];
  errors:      string[];
  capturedAt:  string;
}

// ── Viewport scroll positions ─────────────────────────────────────────────────

const SECTIONS: Array<{
  id:       CapturedScreenshot["section"];
  label:    string;
  scrollPct: number | null;
  fullPage:  boolean;
}> = [
  { id: "hero",         label: "Hero / Above the Fold",     scrollPct: 0,    fullPage: false },
  { id: "services",     label: "Services / Features",        scrollPct: 0.28, fullPage: false },
  { id: "testimonials", label: "Testimonials / Social Proof",scrollPct: 0.58, fullPage: false },
  { id: "cta-footer",   label: "CTA / Footer",               scrollPct: 0.85, fullPage: false },
  { id: "full-brand",   label: "Full Page Brand Overview",   scrollPct: null, fullPage: true  },
];

// ── Safe filename from URL ────────────────────────────────────────────────────

function urlSlug(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "").replace(/[^a-z0-9]/gi, "-").toLowerCase();
  } catch {
    return "website";
  }
}

// ── Core capture function ─────────────────────────────────────────────────────

export async function captureWebsiteScreenshots(
  websiteUrl: string,
  options: { viewportWidth?: number; viewportHeight?: number; waitMs?: number } = {}
): Promise<ScreenshotCaptureResult> {
  const { viewportWidth = 1440, viewportHeight = 900, waitMs = 3000 } = options;
  const slug      = urlSlug(websiteUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const results: CapturedScreenshot[] = [];
  const errors:  string[] = [];

  let playwright: typeof import("playwright") | null = null;

  try {
    playwright = await import("playwright");
  } catch {
    return {
      success:     false,
      screenshots: [],
      errors:      ["Playwright is not installed. Run: npx playwright install chromium"],
      capturedAt:  new Date().toISOString(),
    };
  }

  let browser = null;

  try {
    browser = await playwright.chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: viewportWidth, height: viewportHeight },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();

    page.on("pageerror", () => {});
    page.on("requestfailed", () => {});

    await page.goto(websiteUrl, {
      waitUntil: "networkidle",
      timeout:   30000,
    });

    await page.waitForTimeout(waitMs);

    await page.evaluate(() => {
      const selectors = [
        '[class*="cookie"]', '[class*="Cookie"]',
        '[class*="consent"]', '[class*="Consent"]',
        '[class*="popup"]',   '[class*="Popup"]',
        '[class*="modal"]',   '[class*="Modal"]',
        '[class*="banner"]',  '[class*="Banner"]',
        '[id*="cookie"]',     '[id*="Cookie"]',
      ];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          (el as HTMLElement).style.display = "none";
        });
      });
    });

    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);

    for (const section of SECTIONS) {
      try {
        if (section.fullPage) {
          const buffer = await page.screenshot({
            fullPage: true,
            type:     "png",
          });
          results.push({
            section:  section.id,
            label:    section.label,
            filename: `${slug}-${section.id}-${timestamp}.png`,
            buffer:   Buffer.from(buffer),
            mimeType: "image/png",
          });
        } else {
          const scrollY = section.scrollPct !== null
            ? Math.floor(pageHeight * section.scrollPct)
            : 0;

          await page.evaluate((y: number) => window.scrollTo({ top: y, behavior: "instant" }), scrollY);
          await page.waitForTimeout(600);

          const buffer = await page.screenshot({
            fullPage: false,
            type:     "png",
          });

          results.push({
            section:  section.id,
            label:    section.label,
            filename: `${slug}-${section.id}-${timestamp}.png`,
            buffer:   Buffer.from(buffer),
            mimeType: "image/png",
          });
        }
      } catch (sectionErr) {
        errors.push(`Section "${section.id}" capture failed: ${String(sectionErr)}`);
      }
    }

    await context.close();

  } catch (err) {
    errors.push(`Browser launch or navigation failed: ${String(err)}`);
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }

  return {
    success:     results.length > 0,
    screenshots: results,
    errors,
    capturedAt:  new Date().toISOString(),
  };
}
