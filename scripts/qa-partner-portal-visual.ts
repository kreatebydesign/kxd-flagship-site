/**
 * Partner Portal — static visual QA pages + screenshots.
 * Does not create invitations or mutate production data.
 *
 * Run: npx tsx scripts/qa-partner-portal-visual.ts
 * Live (optional): PARTNER_QA_EMAIL + PARTNER_QA_PASSWORD against http://127.0.0.1:3015
 */
import { createHmac } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext } from "playwright";
import { PARTNER_PLAYBOOK_SECTIONS } from "../lib/portal/partner/playbook";

const ROOT = process.cwd();
const OUT = path.join(ROOT, ".qa-partner-portal-visual");
const PAGES = path.join(OUT, "pages");
const SHOTS = path.join(OUT, "screenshots");
const MEMBER = path.join(SHOTS, "member");
const LIVE = process.env.PARTNER_QA_BASE || "http://127.0.0.1:3015";

function partnerCss(): string {
  const os = readFileSync(
    path.join(ROOT, "design-system/os/styles/kxd-os.css"),
    "utf8",
  );
  const partner = readFileSync(
    path.join(ROOT, "design-system/partner/styles/kxd-partner.css"),
    "utf8",
  );
  const goldVars =
    os.match(/--kxd-os-gold[\s\S]*?--kxd-os-gold-hover:[^;]+;/)?.[0] ?? "";
  return `:root {\n${goldVars}\n  --kxd-os-font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif;\n}\n${partner}`;
}

function shell(inner: string, active: string): string {
  const nav = [
    ["Home", "/portal/partner", "home"],
    ["Playbook", "/portal/partner/playbook", "playbook"],
    ["Submit lead", "/portal/partner/submit-lead", "submit"],
    ["Introductions", "/portal/partner/leads", "leads"],
    ["Earnings", "/portal/partner/earnings", "earnings"],
    ["Book KXD in", "/portal/partner/book", "book"],
  ]
    .map(
      ([label, href, id]) =>
        `<a href="${href}"${id === active ? ' aria-current="page"' : ""}>${label}</a>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>KXD Network</title>
  <style>${partnerCss()}</style>
</head>
<body>
  <div class="kxd-partner-app">
    <div class="kxd-partner-shell">
      <aside class="kxd-partner-sidebar">
        <div class="kxd-partner-brand">
          <div class="kxd-partner-brand__logo">
            <img class="kxd-partner-brand__logo-img" src="${path.join(ROOT, "public/migrated-assets/brand/kxd-logo-transparent.png")}" alt="KXD" width="218" height="205" />
          </div>
          <p class="kxd-partner-brand__name">KXD Network</p>
          <p class="kxd-partner-brand__room">Kyle Whelchel</p>
          <p class="kxd-partner-brand__tag">Private access</p>
        </div>
        <nav class="kxd-partner-nav" aria-label="Partner">${nav}</nav>
      </aside>
      <main class="kxd-partner-main">${inner}</main>
    </div>
  </div>
</body>
</html>`;
}

function courseHtml(input: {
  introductions: number;
  qualified: number;
  discovery: number;
  won: number;
  paid: string;
}): string {
  const step = (label: string, value: string | number, empty: boolean, last = false) =>
    `<li class="${empty ? "is-empty" : ""}"><span class="kxd-partner-course__label">${label}</span><span class="kxd-partner-course__value">${value}</span>${last ? "" : '<span class="kxd-partner-course__to" aria-hidden="true">→</span>'}</li>`;
  return `<ol class="kxd-partner-course">
    ${step("Introduction", input.introductions, input.introductions === 0)}
    ${step("Qualified", input.qualified, input.qualified === 0)}
    ${step("Discovery", input.discovery, input.discovery === 0)}
    ${step("Client won", input.won, input.won === 0)}
    ${step("Paid", input.paid, input.paid === "$0", true)}
  </ol>`;
}

function homeEmptyHtml(): string {
  return shell(
    `
    <div class="kxd-partner-page kxd-partner-page--home">
      <header class="kxd-partner-arrival">
        <p class="kxd-partner-network">KXD Network · Private access</p>
        <h1 class="kxd-partner-arrival__title">Welcome, Kyle.</h1>
        <p class="kxd-partner-arrival__lead">You bring the right introduction. KXD qualifies, discovers, and closes.</p>
        <a class="kxd-partner-btn" href="/portal/partner/submit-lead">Bring your first introduction</a>
      </header>
      <section aria-label="Operating path">
        ${courseHtml({ introductions: 0, qualified: 0, discovery: 0, won: 0, paid: "$0" })}
      </section>
      <section class="kxd-partner-honor" aria-label="Earnings">
        <h2 class="kxd-partner-section__title">Earnings</h2>
        <p class="kxd-partner-paid__value">$0</p>
        <p class="kxd-partner-paid__note">Nothing is paid until KXD closes work you sourced. An introduction becomes earnings only after qualification, discovery, a won client, and KXD approval.</p>
      </section>
      <section class="kxd-partner-section kxd-partner-section--later">
        <h2 class="kxd-partner-section__title">KXD standard</h2>
        <p class="kxd-partner-section__text kxd-partner-section__text--emphasis">Bring a decision-maker, a live moment, and a business that actually needs this work. Judgment over volume.</p>
        <ul class="kxd-partner-fit__list">
          <li>A reachable owner or decision-maker</li>
          <li>A visible gap between the brand and the digital presence</li>
          <li>A clear reason this matters now</li>
          <li>Openness to a short discovery with KXD</li>
        </ul>
      </section>
    </div>
    `,
    "home",
  );
}

function homeActiveHtml(input: {
  introductions: number;
  qualified: number;
  discovery: number;
  won: number;
  paid: string;
  approved: string;
}): string {
  return shell(
    `
    <div class="kxd-partner-page kxd-partner-page--home">
      <header class="kxd-partner-arrival">
        <p class="kxd-partner-network">KXD Network · Private access</p>
        <h1 class="kxd-partner-arrival__title">Welcome, Kyle.</h1>
        <p class="kxd-partner-arrival__lead">You bring the right introduction. KXD qualifies, discovers, and closes.</p>
        <a class="kxd-partner-btn" href="/portal/partner/submit-lead">Bring an introduction</a>
      </header>
      <section aria-label="Operating path">
        ${courseHtml(input)}
      </section>
      <section class="kxd-partner-honor" aria-label="Earnings">
        <h2 class="kxd-partner-section__title">Earnings</h2>
        <div class="kxd-partner-paid">
          <p class="kxd-partner-paid__value">${input.paid}</p>
          <p class="kxd-partner-paid__note">Approved ${input.approved}</p>
        </div>
      </section>
      <section class="kxd-partner-section kxd-partner-section--later">
        <h2 class="kxd-partner-section__title">KXD standard</h2>
        <p class="kxd-partner-section__text kxd-partner-section__text--emphasis">Bring a decision-maker, a live moment, and a business that actually needs this work. Judgment over volume.</p>
        <ul class="kxd-partner-fit__list">
          <li>A reachable owner or decision-maker</li>
          <li>A visible gap between the brand and the digital presence</li>
          <li>A clear reason this matters now</li>
          <li>Openness to a short discovery with KXD</li>
        </ul>
      </section>
    </div>
    `,
    "home",
  );
}

function playbookHtml(): string {
  const sections = PARTNER_PLAYBOOK_SECTIONS.map(
    (section, index) => `
      <section class="kxd-partner-playbook__section" id="${section.id}">
        <p class="kxd-partner-playbook__num">Chapter ${String(index + 1).padStart(2, "0")}</p>
        <h2>${section.title}</h2>
        ${section.pullQuote ? `<p class="kxd-partner-pullquote">${section.pullQuote}</p>` : ""}
        ${section.paragraphs.map((p) => `<p>${p}</p>`).join("")}
        ${
          section.bullets?.length
            ? section.treatment === "scripts"
              ? `<div class="kxd-partner-scripts">${section.bullets.map((b) => `<blockquote class="kxd-partner-script">${b}</blockquote>`).join("")}</div>`
              : `<ul class="kxd-partner-checklist">${section.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>`
            : ""
        }
      </section>`,
  ).join("");

  return shell(
    `
    <div class="kxd-partner-page kxd-partner-page--playbook">
      <p class="kxd-partner-network">KXD Network · Private access</p>
      <h1 class="kxd-partner-title">Playbook</h1>
      <p class="kxd-partner-lead">Find fit, open the door, hand off cleanly. KXD closes the work.</p>
      <div class="kxd-partner-playbook-layout">
        <nav class="kxd-partner-playbook-nav" aria-label="Playbook chapters">
          ${PARTNER_PLAYBOOK_SECTIONS.map((s, i) => `<a href="#${s.id}">${String(i + 1).padStart(2, "0")} · ${s.title}</a>`).join("")}
        </nav>
        <div class="kxd-partner-playbook">${sections}</div>
      </div>
    </div>
    `,
    "playbook",
  );
}

function submitHtml(): string {
  return shell(
    `
    <div class="kxd-partner-page kxd-partner-page--narrow">
      <p class="kxd-partner-network">KXD Network · Private access</p>
      <h1 class="kxd-partner-title">Bring an introduction</h1>
      <p class="kxd-partner-lead">One clean handoff: the business, the opportunity, and how to reach the person who can decide.</p>
      <form class="kxd-partner-form">
        <div class="kxd-partner-form-progress">
          <span class="kxd-partner-form-progress__step" data-active="true">1. The business</span>
          <span class="kxd-partner-form-progress__step">2. The opportunity</span>
          <span class="kxd-partner-form-progress__step">3. The handoff</span>
        </div>
        <section class="kxd-partner-form-section">
          <h2 class="kxd-partner-form-section__title">The business</h2>
          <p class="kxd-partner-form-section__hint">Who they are and how to reach them.</p>
          <div class="kxd-partner-field kxd-partner-field--priority"><label>Business name *</label><p class="kxd-partner-field__help">The company you would introduce — not a vague category.</p><input value="" /></div>
          <div class="kxd-partner-field kxd-partner-field--priority"><label>Contact name *</label><input value="" /></div>
          <div class="kxd-partner-field kxd-partner-field--priority"><label>Contact role</label><input value="" /></div>
          <div class="kxd-partner-field"><label>Email</label><input value="" /></div>
        </section>
        <div class="kxd-partner-submit-moment">
          <p>When you submit, KXD reviews the introduction, owns the close, and keeps internal notes private. You stay attributed to the referral.</p>
          <button class="kxd-partner-btn" type="button">Submit introduction</button>
        </div>
      </form>
    </div>
    `,
    "submit",
  );
}

function leadsHtml(): string {
  return shell(
    `
    <div class="kxd-partner-page">
      <p class="kxd-partner-network">KXD Network · Private access</p>
      <h1 class="kxd-partner-title">Introductions</h1>
      <p class="kxd-partner-lead">Status, movement, and the next useful step — nothing you do not own.</p>
      <div class="kxd-partner-list">
        <article class="kxd-partner-card">
          <h2 class="kxd-partner-card__title">Harbor Peak Design Co</h2>
          <p class="kxd-partner-card__meta">Jordan Hale · Brand · Oct 4, 2026</p>
          <div class="kxd-partner-card__row">
            <span class="kxd-partner-pill">Submitted</span>
            <span class="kxd-partner-card__meta">Latest · Submitted</span>
          </div>
          <p class="kxd-partner-card__next"><strong>Wait for review</strong> — KXD will confirm fit before you book discovery.</p>
        </article>
      </div>
    </div>
    `,
    "leads",
  );
}

function leadDetailHtml(): string {
  return shell(
    `
    <div class="kxd-partner-page kxd-partner-page--narrow">
      <p class="kxd-partner-network">KXD Network · Private access</p>
      <h1 class="kxd-partner-title">Harbor Peak Design Co</h1>
      <p class="kxd-partner-lead">Jordan Hale · Brand</p>
      <div class="kxd-partner-status-block">
        <span class="kxd-partner-pill">Qualified</span>
        <p class="kxd-partner-section__text">This looks like a fit. Discovery is the natural next step.</p>
        <p class="kxd-partner-card__next"><strong>Book KXD in</strong> — Reserve discovery for this introduction.</p>
      </div>
      <div class="kxd-partner-actions-inline">
        <a class="kxd-partner-btn" href="/portal/partner/book">Book KXD in</a>
        <a class="kxd-partner-btn kxd-partner-btn--ghost" href="/portal/partner/leads">Back to introductions</a>
      </div>
      <section class="kxd-partner-section">
        <h2 class="kxd-partner-section__title">Opportunity</h2>
        <dl class="kxd-partner-detail-grid">
          <div class="kxd-partner-detail-item"><dt>Contact role</dt><dd>Owner</dd></div>
          <div class="kxd-partner-detail-item"><dt>Decision maker</dt><dd>Confirmed</dd></div>
          <div class="kxd-partner-detail-item"><dt>Email</dt><dd>jordan@example.com</dd></div>
        </dl>
      </section>
      <section class="kxd-partner-section">
        <h2 class="kxd-partner-section__title">Your notes</h2>
        <p class="kxd-partner-empty">Add context only you and KXD should keep with this introduction.</p>
        <form class="kxd-partner-form"><div class="kxd-partner-field"><label>Note</label><textarea></textarea></div><button class="kxd-partner-btn kxd-partner-btn--ghost" type="button">Add note</button></form>
      </section>
    </div>
    `,
    "leads",
  );
}

function earningsHtml(): string {
  return shell(
    `
    <div class="kxd-partner-page">
      <p class="kxd-partner-network">KXD Network · Private access</p>
      <h1 class="kxd-partner-title">Earnings</h1>
      <p class="kxd-partner-lead">Approved and paid only. Nothing appears here until KXD clears it.</p>
      <section class="kxd-partner-paid kxd-partner-paid--hero" aria-label="Paid to date">
        <p class="kxd-partner-paid__label">Paid to date</p>
        <p class="kxd-partner-paid__value">$0</p>
        <p class="kxd-partner-paid__note">Approved outstanding $0</p>
      </section>
      <section class="kxd-partner-section">
        <h2 class="kxd-partner-section__title">How earnings work</h2>
        <ol class="kxd-partner-earn-path">
          <li><span class="kxd-partner-earn-path__num">01</span><div class="kxd-partner-earn-path__copy"><strong>Project commission</strong><p>10% of collected eligible project revenue you sourced.</p></div><span class="kxd-partner-earn-path__amount">$0</span></li>
          <li><span class="kxd-partner-earn-path__num">02</span><div class="kxd-partner-earn-path__copy"><strong>Recurring bonus</strong><p>10% of paid eligible recurring revenue (Website Care, Website Management, SEO &amp; Growth) for the first 3 paid months.</p></div><span class="kxd-partner-earn-path__amount">$0</span></li>
          <li><span class="kxd-partner-earn-path__num">03</span><div class="kxd-partner-earn-path__copy"><strong>Retention kicker</strong><p>10% when the sourced client stays active through month 4.</p></div><span class="kxd-partner-earn-path__amount">$0</span></li>
          <li><span class="kxd-partner-earn-path__num">04</span><div class="kxd-partner-earn-path__copy"><strong>Performance bonus</strong><p>$250 when you source 3 paid projects within 90 days. Paid after KXD approves.</p></div><span class="kxd-partner-earn-path__amount">$0</span></li>
        </ol>
      </section>
      <section class="kxd-partner-section">
        <h2 class="kxd-partner-section__title">Entries</h2>
        <p class="kxd-partner-empty">Nothing approved yet. When a sourced project or retainer pays and KXD clears the commission, it lands here.</p>
      </section>
    </div>
    `,
    "earnings",
  );
}

function bookHtml(): string {
  return shell(
    `
    <div class="kxd-partner-page kxd-partner-page--narrow">
      <p class="kxd-partner-network">KXD Network · Private access</p>
      <h1 class="kxd-partner-title">Book KXD in</h1>
      <p class="kxd-partner-lead">You open the door. KXD runs the call. Reserve discovery for one specific introduction.</p>
      <div class="kxd-partner-book-panel">
        <h2 class="kxd-partner-book-panel__title">Choose a time</h2>
        <form class="kxd-partner-form">
          <div class="kxd-partner-field kxd-partner-field--priority"><label>Referral</label><select><option>Harbor Peak Design Co — Jordan Hale — Oct 4</option></select></div>
          <fieldset class="kxd-partner-slots">
            <legend>Available times · <span class="kxd-partner-slots__tz">America/Los_Angeles</span></legend>
            <label class="kxd-partner-slot"><input type="radio" name="slot" checked /><span class="kxd-partner-slot__time">Tue, Oct 7, 10:00 AM</span></label>
            <label class="kxd-partner-slot"><input type="radio" name="slot" /><span class="kxd-partner-slot__time">Tue, Oct 7, 10:30 AM</span></label>
            <label class="kxd-partner-slot"><input type="radio" name="slot" /><span class="kxd-partner-slot__time">Wed, Oct 8, 2:00 PM</span></label>
          </fieldset>
          <div class="kxd-partner-field"><label>Notes</label><textarea placeholder="Anything KXD should know before the call"></textarea></div>
          <button class="kxd-partner-btn" type="button">Confirm discovery</button>
        </form>
      </div>
      <div class="kxd-partner-book-after">
        <h2 class="kxd-partner-section__title">What happens next</h2>
        <ol>
          <li>You choose the referral and preferred window.</li>
          <li>KXD confirms the discovery on the studio calendar.</li>
          <li>You stay attributed — the close stays with KXD.</li>
        </ol>
      </div>
    </div>
    `,
    "book",
  );
}

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
] as const;

async function shootFile(
  browser: Browser,
  htmlPath: string,
  outStem: string,
  dest: string,
) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const tab = await context.newPage();
    await tab.goto(`file://${htmlPath}`);
    await tab.waitForTimeout(180);
    await tab.screenshot({
      path: path.join(dest, `${outStem}-${vp.name}.png`),
      fullPage: true,
    });
    await context.close();
  }
}

async function shootLive(
  context: BrowserContext,
  route: string,
  outStem: string,
) {
  const page = await context.newPage();
  await page.goto(`${LIVE}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
  if (page.url().includes("/portal/login")) {
    throw new Error(`Live session missing for ${route}`);
  }
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(120);
    await page.screenshot({
      path: path.join(MEMBER, `${outStem}-${vp.name}.png`),
      fullPage: true,
    });
  }
  await page.close();
}

function signPortalCookie(portalUserId: number, secret: string): string {
  const sig = createHmac("sha256", secret)
    .update(`portal:${portalUserId}`)
    .digest("hex");
  return `${portalUserId}.${sig}`;
}

async function captureLive(browser: Browser): Promise<{
  ok: boolean;
  note: string;
  routes: string[];
}> {
  const email = process.env.PARTNER_QA_EMAIL?.trim();
  const password = process.env.PARTNER_QA_PASSWORD;
  const portalUserId = Number(process.env.PARTNER_QA_PORTAL_USER_ID || "");
  const secret =
    process.env.PAYLOAD_SECRET?.trim() || "kxd-dev-secret-change-in-production";

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    baseURL: LIVE,
  });

  if (email && password) {
    const login = await context.newPage();
    const res = await login.request.post(`${LIVE}/api/portal/auth/login`, {
      data: { email, password },
    });
    if (!res.ok()) {
      await context.close();
      return { ok: false, note: `Live login failed (${res.status()}).`, routes: [] };
    }
    const body = (await res.json()) as { ok?: boolean; accessMode?: string };
    await login.close();
    if (!body.ok || body.accessMode !== "partner") {
      await context.close();
      return {
        ok: false,
        note: "Live login did not return a partner session.",
        routes: [],
      };
    }
  } else if (Number.isFinite(portalUserId) && portalUserId > 0) {
    await context.addCookies([
      {
        name: "kxd-portal-session",
        value: signPortalCookie(portalUserId, secret),
        url: LIVE,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  } else {
    await context.close();
    return {
      ok: false,
      note: "Live capture skipped — set PARTNER_QA_PORTAL_USER_ID or partner login env.",
      routes: [],
    };
  }

  const routes = [
    { id: "home-earned", path: "/portal/partner" },
    { id: "playbook", path: "/portal/partner/playbook" },
    { id: "submit-lead", path: "/portal/partner/submit-lead" },
    { id: "leads", path: "/portal/partner/leads" },
    { id: "earnings", path: "/portal/partner/earnings" },
    { id: "book", path: "/portal/partner/book" },
  ];

  const homePage = await context.newPage();
  await homePage.goto(`${LIVE}/portal/partner`, { waitUntil: "networkidle" });
  const values = await homePage.locator(".kxd-partner-course__value").allTextContents();
  const labels = await homePage.locator(".kxd-partner-course__label").allTextContents();
  if (values.length >= 5) {
    const byLabel = Object.fromEntries(labels.map((label, i) => [label, values[i] ?? ""]));
    const paid = byLabel.Paid || values[4] || "$0";
    const approvedNote =
      (await homePage.locator(".kxd-partner-paid__note").first().textContent()) ?? "";
    const approved = approvedNote.replace(/^Approved\s+/i, "").trim() || paid;
    const activeHtml = homeActiveHtml({
      introductions: Number(byLabel.Introduction || values[0] || 0),
      qualified: Number(byLabel.Qualified || values[1] || 0),
      discovery: Number(byLabel.Discovery || values[2] || 0),
      won: Number(byLabel["Client won"] || values[3] || 0),
      paid,
      approved,
    });
    writeFileSync(path.join(PAGES, "home-earned.html"), activeHtml, "utf8");
    await shootFile(browser, path.join(PAGES, "home-earned.html"), "home-earned", SHOTS);
    await shootFile(browser, path.join(PAGES, "home-earned.html"), "home-earned", MEMBER);
  }
  await homePage.close();

  for (const route of routes) {
    await shootLive(context, route.path, route.id);
  }

  const leadsPage = await context.newPage();
  await leadsPage.goto(`${LIVE}/portal/partner/leads`, { waitUntil: "networkidle" });
  const first = await leadsPage.locator('a[href^="/portal/partner/leads/"]').first();
  if (await first.count()) {
    const href = await first.getAttribute("href");
    if (href) await shootLive(context, href, "lead-detail");
  }
  await leadsPage.close();
  await context.close();

  return {
    ok: true,
    note: "Live partner session captured against local preview.",
    routes: routes.map((r) => r.id).concat(["lead-detail"]),
  };
}

async function loadLocalSnapshotForActiveHome(): Promise<{
  introductions: number;
  qualified: number;
  discovery: number;
  won: number;
  paid: string;
  approved: string;
} | null> {
  const raw = process.env.PARTNER_QA_SNAPSHOT;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.introductions !== "number") return null;
    return {
      introductions: parsed.introductions,
      qualified: Number(parsed.qualified ?? 0),
      discovery: Number(parsed.discovery ?? 0),
      won: Number(parsed.won ?? 0),
      paid: String(parsed.paid ?? "$0"),
      approved: String(parsed.approved ?? "$0"),
    };
  } catch {
    return null;
  }
}

async function main() {
  mkdirSync(PAGES, { recursive: true });
  mkdirSync(SHOTS, { recursive: true });
  mkdirSync(MEMBER, { recursive: true });

  const localActive = await loadLocalSnapshotForActiveHome();
  const pages = [
    { id: "home", html: homeEmptyHtml() },
    { id: "playbook", html: playbookHtml() },
    { id: "submit-lead", html: submitHtml() },
    { id: "leads", html: leadsHtml() },
    { id: "lead-detail", html: leadDetailHtml() },
    { id: "earnings", html: earningsHtml() },
    { id: "book", html: bookHtml() },
  ];
  if (localActive) {
    pages.splice(1, 0, {
      id: "home-earned",
      html: homeActiveHtml(localActive),
    });
  }

  for (const page of pages) {
    writeFileSync(path.join(PAGES, `${page.id}.html`), page.html, "utf8");
  }
  writeFileSync(path.join(PAGES, "home-new.html"), homeEmptyHtml(), "utf8");

  const browser = await chromium.launch({ headless: true });

  for (const page of pages) {
    await shootFile(
      browser,
      path.join(PAGES, `${page.id}.html`),
      page.id,
      SHOTS,
    );
    await shootFile(
      browser,
      path.join(PAGES, `${page.id}.html`),
      page.id,
      MEMBER,
    );
  }
  await shootFile(browser, path.join(PAGES, "home-new.html"), "home-new", MEMBER);
  await shootFile(browser, path.join(PAGES, "home.html"), "home", MEMBER);

  let live: { ok: boolean; note: string; routes: string[] } = {
    ok: false,
    note: "Live capture not attempted.",
    routes: [],
  };
  try {
    live = await captureLive(browser);
  } catch (err) {
    live = {
      ok: false,
      note: `Live capture failed: ${err instanceof Error ? err.message : String(err)}`,
      routes: [],
    };
  }
  await browser.close();

  writeFileSync(
    path.join(OUT, "qa-report.json"),
    JSON.stringify(
      {
        ok: true,
        pages: pages.map((p) => p.id),
        viewports: VIEWPORTS.map((v) => v.name),
        memberDir: MEMBER,
        live,
        note: "Empty Home uses genuine zero snapshot composition. Active Home uses live local partner data when login succeeds.",
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Partner visual QA written to ${OUT}`);
  console.log(`Member screenshots: ${MEMBER}`);
  console.log(`Live: ${live.note}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
