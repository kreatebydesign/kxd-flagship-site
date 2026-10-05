/**
 * Partner Portal Phase 1 — static visual QA pages + screenshots.
 * Does not create invitations or mutate production data.
 *
 * Run: npx tsx scripts/qa-partner-portal-visual.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { PARTNER_PLAYBOOK_SECTIONS } from "../lib/portal/partner/playbook";

const ROOT = process.cwd();
const OUT = path.join(ROOT, ".qa-partner-portal-visual");
const PAGES = path.join(OUT, "pages");
const SHOTS = path.join(OUT, "screenshots");

function partnerCss(): string {
  const os = readFileSync(
    path.join(ROOT, "design-system/os/styles/kxd-os.css"),
    "utf8",
  );
  const partner = readFileSync(
    path.join(ROOT, "design-system/partner/styles/kxd-partner.css"),
    "utf8",
  );
  // Pull only the gold token block from OS for the partner room.
  const goldVars = os.match(/--kxd-os-gold[\s\S]*?--kxd-os-gold-hover:[^;]+;/)?.[0] ?? "";
  return `:root {\n${goldVars}\n  --kxd-os-font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif;\n}\n${partner}`;
}

function shell(inner: string, active: string): string {
  const nav = [
    ["Home", "/portal/partner", "home"],
    ["Playbook", "/portal/partner/playbook", "playbook"],
    ["Submit lead", "/portal/partner/submit-lead", "submit"],
    ["My leads", "/portal/partner/leads", "leads"],
    ["My earnings", "/portal/partner/earnings", "earnings"],
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
  <title>KXD Partner Portal QA</title>
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
          <p class="kxd-partner-brand__name">Partner room</p>
          <p class="kxd-partner-brand__room">Kyle Whelchel</p>
        </div>
        <nav class="kxd-partner-nav" aria-label="Partner">${nav}</nav>
      </aside>
      <main class="kxd-partner-main">${inner}</main>
    </div>
  </div>
</body>
</html>`;
}

function homeHtml(): string {
  return shell(
    `
    <div class="kxd-partner-page">
      <header class="kxd-partner-hero">
        <h1 class="kxd-partner-title">Welcome, Kyle.</h1>
        <p class="kxd-partner-lead">Track your introductions and keep the next opportunity moving.</p>
      </header>
      <section class="kxd-partner-board" aria-label="Focus">
        <div class="kxd-partner-cta">
          <h2 class="kxd-partner-cta__title">Submit lead</h2>
          <p class="kxd-partner-cta__hint">Keep the pipeline moving with the next strong introduction.</p>
          <a class="kxd-partner-btn" href="/portal/partner/submit-lead">Submit lead</a>
        </div>
        <div class="kxd-partner-paid">
          <p class="kxd-partner-paid__label">Paid earnings</p>
          <p class="kxd-partner-paid__value">$0</p>
          <p class="kxd-partner-paid__note">Approved $0</p>
        </div>
      </section>
      <section class="kxd-partner-section">
        <h2 class="kxd-partner-section__title">Progress</h2>
        <ol class="kxd-partner-pipe" aria-label="Pipeline">
          <li class="is-empty"><span class="kxd-partner-pipe__value">0</span><span class="kxd-partner-pipe__label">Leads submitted</span></li>
          <li class="is-empty"><span class="kxd-partner-pipe__value">0</span><span class="kxd-partner-pipe__label">Qualified opportunities</span></li>
          <li class="is-empty"><span class="kxd-partner-pipe__value">0</span><span class="kxd-partner-pipe__label">Discovery calls booked</span></li>
          <li class="is-empty"><span class="kxd-partner-pipe__value">0</span><span class="kxd-partner-pipe__label">Won clients</span></li>
        </ol>
      </section>
      <section class="kxd-partner-section kxd-partner-section--later">
        <div class="kxd-partner-fit">
          <h2 class="kxd-partner-section__title">What a strong lead looks like</h2>
          <div class="kxd-partner-fit__grid">
            <p class="kxd-partner-section__text">Not every conversation belongs here. Send introductions where the business is real, the timing is live, and a decision maker will take the call.</p>
            <ul class="kxd-partner-fit__list">
              <li>Owner or decision maker is reachable</li>
              <li>Visible gap between the brand and the digital presence</li>
              <li>A clear reason this matters now</li>
              <li>Open to a short discovery with KXD</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
    `,
    "home",
  );
}

function playbookHtml(): string {
  const sections = PARTNER_PLAYBOOK_SECTIONS.map(
    (section, index) => `
      <section class="kxd-partner-playbook__section">
        <p class="kxd-partner-eyebrow">${String(index + 1).padStart(2, "0")}</p>
        <h2>${section.title}</h2>
        ${section.paragraphs.map((p) => `<p>${p}</p>`).join("")}
        ${
          section.bullets?.length
            ? `<ul>${section.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>`
            : ""
        }
      </section>`,
  ).join("");

  return shell(
    `
    <div class="kxd-partner-page kxd-partner-page--narrow">
      <p class="kxd-partner-eyebrow">Field guide</p>
      <h1 class="kxd-partner-title">Partner playbook</h1>
      <span class="kxd-partner-hairline" aria-hidden="true"></span>
      <p class="kxd-partner-lead">A calm in-app guide for finding fit, opening conversations, and handing opportunities to KXD with precision.</p>
      <div class="kxd-partner-playbook">${sections}</div>
    </div>
    `,
    "playbook",
  );
}

function submitHtml(): string {
  return shell(
    `
    <div class="kxd-partner-page kxd-partner-page--narrow">
      <p class="kxd-partner-eyebrow">Handoff</p>
      <h1 class="kxd-partner-title">Submit a lead</h1>
      <span class="kxd-partner-hairline" aria-hidden="true"></span>
      <p class="kxd-partner-lead">Give KXD a clean introduction — business, opportunity, and how to reach the decision maker. Quality beats volume.</p>
      <form class="kxd-partner-form">
        <div class="kxd-partner-field"><label>Business name *</label><input value="" /></div>
        <div class="kxd-partner-field"><label>Contact name *</label><input value="" /></div>
        <div class="kxd-partner-field"><label>Contact role</label><input value="" /></div>
        <div class="kxd-partner-field"><label>Visible problem / opportunity</label><textarea></textarea></div>
        <div class="kxd-partner-field"><label>Why now</label><textarea></textarea></div>
        <label class="kxd-partner-check"><input type="checkbox" /><span>Decision maker confirmed</span></label>
        <button class="kxd-partner-btn" type="button">Submit lead</button>
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
      <p class="kxd-partner-eyebrow">Your pipeline</p>
      <h1 class="kxd-partner-title">My leads</h1>
      <span class="kxd-partner-hairline" aria-hidden="true"></span>
      <p class="kxd-partner-lead">Every introduction you own — status, movement, and the next useful step.</p>
      <div class="kxd-partner-list">
        <article class="kxd-partner-card">
          <h2 class="kxd-partner-card__title">Harbor Peak Design Co</h2>
          <p class="kxd-partner-card__meta">Jordan Hale · Brand · Oct 4, 2026</p>
          <span class="kxd-partner-pill">Submitted</span>
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
      <p class="kxd-partner-eyebrow">Deal journal</p>
      <h1 class="kxd-partner-title">Harbor Peak Design Co</h1>
      <span class="kxd-partner-hairline" aria-hidden="true"></span>
      <p class="kxd-partner-lead">Jordan Hale · Brand</p>
      <div class="kxd-partner-status-block">
        <span class="kxd-partner-pill">Qualified</span>
        <p class="kxd-partner-section__text">KXD confirmed this is a real opportunity. Book discovery when the decision maker is ready.</p>
        <p class="kxd-partner-card__next" style="margin-top:0.75rem"><strong>Book KXD in</strong> — Reserve discovery for this introduction.</p>
      </div>
      <div class="kxd-partner-actions-inline">
        <a class="kxd-partner-btn" href="/portal/partner/book">Book KXD in</a>
        <a class="kxd-partner-btn kxd-partner-btn--ghost" href="/portal/partner/leads">Back to my leads</a>
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
        <form class="kxd-partner-form"><div class="kxd-partner-field"><label>Note</label><textarea></textarea></div><button class="kxd-partner-btn" type="button">Add note</button></form>
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
      <p class="kxd-partner-eyebrow">Approved only</p>
      <h1 class="kxd-partner-title">My earnings</h1>
      <span class="kxd-partner-hairline" aria-hidden="true"></span>
      <p class="kxd-partner-lead">Track your approved commissions, paid earnings, and referral bonuses.</p>
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
      <h1 class="kxd-partner-title">Book KXD in</h1>
      <p class="kxd-partner-lead">Reserve a 30-minute discovery for a specific introduction. You open the door — KXD runs the call.</p>
      <div class="kxd-partner-book-panel">
        <h2 class="kxd-partner-book-panel__title">Choose a time</h2>
        <form class="kxd-partner-form">
          <div class="kxd-partner-field"><label>Referral</label><select><option>Harbor Peak Design Co — Jane Reyes — Oct 2</option><option>Harbor Peak Design Co — Marcus Cole — Oct 4</option></select></div>
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

async function main() {
  mkdirSync(PAGES, { recursive: true });
  mkdirSync(SHOTS, { recursive: true });

  const pages = [
    { id: "home", html: homeHtml() },
    { id: "playbook", html: playbookHtml() },
    { id: "submit-lead", html: submitHtml() },
    { id: "leads", html: leadsHtml() },
    { id: "lead-detail", html: leadDetailHtml() },
    { id: "earnings", html: earningsHtml() },
    { id: "book", html: bookHtml() },
  ];

  for (const page of pages) {
    writeFileSync(path.join(PAGES, `${page.id}.html`), page.html, "utf8");
  }

  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: "1440", width: 1440, height: 900 },
    { name: "390", width: 390, height: 844 },
  ];

  for (const page of pages) {
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
      });
      const tab = await context.newPage();
      await tab.goto(`file://${path.join(PAGES, `${page.id}.html`)}`);
      await tab.waitForTimeout(200);
      await tab.screenshot({
        path: path.join(SHOTS, `${page.id}-${vp.name}.png`),
        fullPage: true,
      });
      await context.close();
    }
  }

  await browser.close();

  writeFileSync(
    path.join(OUT, "qa-report.json"),
    JSON.stringify(
      {
        ok: true,
        pages: pages.map((p) => p.id),
        viewports: viewports.map((v) => v.name),
        note: "Static composition QA — real partner login not created.",
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Partner visual QA written to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
