/**
 * Network Command Phase 2 — static visual QA.
 * Empty + active compositions from the fixture matrix. Does not mutate data.
 *
 * Run: npx tsx scripts/qa-network-command-visual.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { deriveNetworkCommand } from "../lib/portal/partner/network-command";

const ROOT = process.cwd();
const OUT = path.join(ROOT, ".qa-partner-portal-visual");
const PAGES = path.join(OUT, "pages");
const SHOTS = path.join(OUT, "screenshots", "network-command");
const LOGO = path.join(ROOT, "public/migrated-assets/brand/kxd-logo-transparent.png");

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 1100 },
  { name: "390", width: 390, height: 844 },
] as const;

const NOW = new Date("2026-10-06T12:00:00.000Z");

function css(): string {
  const os = readFileSync(
    path.join(ROOT, "design-system/os/styles/kxd-os.css"),
    "utf8",
  );
  const command = readFileSync(
    path.join(ROOT, "design-system/os/styles/kxd-network-command.css"),
    "utf8",
  );
  const goldVars =
    os.match(/--kxd-os-gold[\s\S]*?--kxd-os-gold-hover:[^;]+;/)?.[0] ?? "";
  return `:root {\n${goldVars}\n  --kxd-os-font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif;\n}\n${command}`;
}

function usd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function signalLabel(signal: string | null): string {
  if (signal === "onboarding") return "Onboarding";
  if (signal === "building_momentum") return "Building momentum";
  if (signal === "needs_review") return "Needs review";
  return "Quiet";
}

function hoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000).toISOString();
}

function rateLine(rate: { numerator: number; denominator: number; percent: number | null }): string {
  if (rate.percent == null) return "";
  return ` · ${rate.percent}%`;
}

function pageHtml(input: {
  id: string;
  title: string;
  selectedId: number | null;
}): string {
  const empty = input.id === "empty";
  const workspace = deriveNetworkCommand({
    profiles: empty
      ? []
      : [
          { id: 1, displayName: "Partner A", status: "active", notes: null },
          { id: 2, displayName: "Partner B", status: "active", notes: null },
        ],
    referrals: empty
      ? []
      : [
          {
            id: 21,
            partnerId: 2,
            businessName: "Harbor Goods",
            contactName: "Ann Harbor",
            visibilityState: "submitted",
            internalStatus: "new",
            decisionMakerConfirmed: false,
            internalNotes: null,
            promotedSalesLeadId: 201,
            createdAt: hoursAgo(60),
          },
          {
            id: 22,
            partnerId: 2,
            businessName: "North Studio",
            contactName: "Lee North",
            visibilityState: "qualified",
            internalStatus: "qualified",
            decisionMakerConfirmed: false,
            internalNotes: null,
            promotedSalesLeadId: 202,
            createdAt: hoursAgo(10 * 24),
          },
          {
            id: 23,
            partnerId: 2,
            businessName: "Cedar Hospitality",
            contactName: "Pat Cedar",
            visibilityState: "discovery_booked",
            internalStatus: "in_conversation",
            decisionMakerConfirmed: false,
            internalNotes: null,
            promotedSalesLeadId: 203,
            createdAt: hoursAgo(8 * 24),
          },
          {
            id: 24,
            partnerId: 2,
            businessName: "Atlas Interiors",
            contactName: "Sam Atlas",
            visibilityState: "won",
            internalStatus: "closed",
            decisionMakerConfirmed: false,
            internalNotes: null,
            promotedSalesLeadId: 204,
            createdAt: hoursAgo(6 * 24),
          },
        ],
    bookings: [],
    notes: [],
    earnings: empty
      ? []
      : [
          {
            id: 301,
            partnerId: 2,
            earningType: "project_commission",
            paymentStatus: "pending_approval",
            amountCents: 12_000,
            relatedBusinessName: "Atlas Interiors",
            relatedReferralId: 24,
            relatedSalesLeadId: 204,
            approvedAt: null,
            paidAt: null,
            createdAt: hoursAgo(24),
          },
          {
            id: 302,
            partnerId: 2,
            earningType: "project_commission",
            paymentStatus: "approved",
            amountCents: 8_000,
            relatedBusinessName: "Cedar Hospitality",
            relatedReferralId: 23,
            relatedSalesLeadId: 203,
            approvedAt: hoursAgo(5 * 24),
            paidAt: null,
            createdAt: hoursAgo(5 * 24),
          },
          {
            id: 303,
            partnerId: 2,
            earningType: "project_commission",
            paymentStatus: "approved",
            amountCents: 9_000,
            relatedBusinessName: "North Studio",
            relatedReferralId: 22,
            relatedSalesLeadId: 202,
            approvedAt: hoursAgo(4 * 24),
            paidAt: null,
            createdAt: hoursAgo(4 * 24),
          },
        ],
    salesLeads: empty
      ? []
      : [
          {
            id: 201,
            partnerId: 2,
            sourceReferralId: 21,
            companyName: "Harbor Goods",
            status: "new",
            nextFollowUp: hoursAgo(-24),
          },
          {
            id: 204,
            partnerId: 2,
            sourceReferralId: 24,
            companyName: "Atlas Interiors",
            status: "won",
            nextFollowUp: null,
          },
        ],
    policy: {
      performanceBonusEnabled: true,
      performanceBonusAmountCents: 25_000,
      performanceBonusProjectCount: 3,
      performanceBonusWindowDays: 90,
    },
    now: NOW,
  });

  const selected =
    workspace.activePartners.find((p) => p.id === input.selectedId) ??
    workspace.activePartners.find((p) => p.id === workspace.networkDecision.partnerId) ??
    workspace.activePartners[0] ??
    null;
  const decision = workspace.networkDecision;

  const roster = workspace.activePartners
    .map(
      (row) => `<li>
        <a href="#" class="${selected?.id === row.id ? "is-current" : ""}">
          <span class="kxd-nc__roster-name">${row.displayName}</span>
          <span class="kxd-nc__roster-meta">${signalLabel(row.signal)}${
            row.lastActivity ? ` · ${row.lastActivity.label}` : " · No activity yet"
          }</span>
        </a>
      </li>`,
    )
    .join("");

  const path = selected
    ? [
        ["Introductions submitted", String(selected.submittedLeads), ""],
        [
          "Qualified",
          String(selected.qualifiedLeads),
          rateLine(selected.qualifiedRate),
        ],
        [
          "Discovery booked",
          String(selected.bookedCalls),
          rateLine(selected.discoveryRate),
        ],
        ["Clients won", String(selected.wonClients), rateLine(selected.wonRate)],
        ["Paid", usd(selected.paidEarningsCents), ""],
      ]
        .map(
          ([label, value, rate]) =>
            `<li><span>${label}</span><span>${value}${rate}</span></li>`,
        )
        .join("")
    : "";

  const intros = (selected?.referrals ?? [])
    .map(
      (row) => `<article>
        <h3>${row.businessName}</h3>
        <p>${row.contactName} · ${row.visibilityState.replaceAll("_", " ")}</p>
      </article>`,
    )
    .join("");

  const record = selected
    ? `<article class="kxd-nc__record" aria-label="Partner record">
        <p class="kxd-nc__record-kicker">${signalLabel(selected.signal)}</p>
        <h2 class="kxd-nc__record-name">${selected.displayName}</h2>
        <p class="kxd-nc__record-signal">${selected.signalExplanation}</p>
        <p class="kxd-nc__paid-label">Paid to date</p>
        <p class="kxd-nc__paid">${usd(selected.paidEarningsCents)}</p>
        <p class="kxd-nc__approved">Approved ${usd(selected.approvedEarningsCents)}</p>
        <ol class="kxd-nc__path">${path}</ol>
        ${selected.bonusProgress ? `<p class="kxd-nc__bonus">${selected.bonusProgress.sentence}</p>` : ""}
        ${selected.highPotential ? `<p class="kxd-nc__potential">${selected.highPotential.sentence}</p>` : ""}
      </article>`
    : `<article class="kxd-nc__record">
        <p class="kxd-nc__record-kicker">Record</p>
        <h2 class="kxd-nc__record-name">No partner selected</h2>
        <p class="kxd-nc__record-signal">Active partners will appear here as a record, not a dashboard.</p>
      </article>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${input.title}</title>
  <style>${css()}</style>
</head>
<body>
  <div class="kxd-nc">
    <div class="kxd-nc__frame">
      <header class="kxd-nc__mast">
        <div class="kxd-nc__brand">
          <img src="${LOGO}" alt="KXD" width="26" height="24" />
          <div>
            <p class="kxd-nc__kicker">Owner</p>
            <h1 class="kxd-nc__title">Network</h1>
          </div>
        </div>
        <a class="kxd-nc__crumb" href="#">Sales</a>
      </header>
      <section class="kxd-nc__decision">
        <p class="kxd-nc__decision-kicker">Decision</p>
        <h2 class="kxd-nc__decision-title">${decision.label}</h2>
        <p class="kxd-nc__decision-body">${decision.explanation}</p>
        ${
          decision.kind !== "none"
            ? `<button type="button" class="kxd-nc__btn">Approve earning</button>`
            : ""
        }
      </section>
      <div class="kxd-nc__spread">
        <aside class="kxd-nc__roster">
          <p class="kxd-nc__roster-label">Active</p>
          ${
            roster
              ? `<ul class="kxd-nc__roster-list">${roster}</ul>`
              : `<p class="kxd-nc__empty">No active partners yet.</p>`
          }
        </aside>
        ${record}
      </div>
      <div class="kxd-nc__chapters">
        <section>
          <p class="kxd-nc__chapter-label">Introductions</p>
          ${
            intros
              ? `<div class="kxd-nc__intro">${intros}</div>`
              : `<p class="kxd-nc__empty">No introductions on this record.</p>`
          }
        </section>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  mkdirSync(PAGES, { recursive: true });
  mkdirSync(SHOTS, { recursive: true });

  const pages = [
    {
      id: "network-empty",
      html: pageHtml({ id: "empty", title: "Network · empty", selectedId: null }),
    },
    {
      id: "network-active",
      html: pageHtml({ id: "active", title: "Network · active", selectedId: 2 }),
    },
    {
      id: "network-onboarding",
      html: pageHtml({ id: "active", title: "Network · onboarding", selectedId: 1 }),
    },
  ];

  const browser = await chromium.launch({ headless: true });
  for (const page of pages) {
    const file = path.join(PAGES, `${page.id}.html`);
    writeFileSync(file, page.html, "utf8");
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const tab = await context.newPage();
      await tab.goto(`file://${file}`);
      await tab.waitForTimeout(200);
      await tab.screenshot({
        path: path.join(SHOTS, `${page.id}-${viewport.name}.png`),
        fullPage: true,
      });
      await context.close();
    }
  }
  await browser.close();
  console.log(`Wrote ${SHOTS}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
