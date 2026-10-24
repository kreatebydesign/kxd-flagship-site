/**
 * Proposal findByID error handling — verify:proposal-find-errors
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

console.log("\nProposal find errors — verify:proposal-find-errors\n");

const proposalFind = read("lib/sales/proposal-find.ts");
assert.match(proposalFind, /isPayloadNotFoundError/);
assert.match(proposalFind, /findProposalByIdForOperator/);
assert.match(proposalFind, /console\.error\("\[KXD proposals\] findByID failed"/);
assert.doesNotMatch(proposalFind, /catch\s*\{\s*return null/);

const services = read("lib/proposal-builder/services.ts");
assert.match(services, /findProposalByIdForOperator/);
assert.match(
  services,
  /export async function getProposal\(id: number\)[\s\S]*?findProposalByIdForOperator/,
);
assert.doesNotMatch(services, /export async function getProposal[\s\S]{0,400}catch/);

const salesProposals = read("lib/sales/proposals.ts");
assert.match(salesProposals, /findProposalByIdForOperator/);

const dbHealth = read("app/api/db-health/route.ts");
assert.match(dbHealth, /requirePayloadAdminApi\(request\)/);
assert.match(dbHealth, /isStudioPayloadOperator/);
assert.match(dbHealth, /resolvePayloadDatabaseHostname/);

const dbTarget = read("app/api/admin/system/database-target/route.ts");
assert.match(dbTarget, /knProposalIdsPresent/);
assert.match(dbTarget, /isProductionMain/);

const middleware = read("middleware.ts");
assert.match(middleware, /"\/api\/db-health"/);

const previewPage = read("app/admin/sales/proposals/[id]/preview/page.tsx");
assert.match(previewPage, /srcDoc=\{html\}/);
assert.match(previewPage, /getProposalPreviewHtmlForOperator/);
assert.doesNotMatch(
  previewPage,
  /src=\{`\/api\/admin\/proposal-builder\/\$\{id\}\/preview`\}/,
);
assert.doesNotMatch(previewPage, /import\s*\{[^}]*OperationsShell/);
assert.match(previewPage, /export const runtime = "nodejs"/);

const previewHtml = read("lib/proposal-builder/preview-html.ts");
assert.match(previewHtml, /getProposalPreviewHtmlForOperator/);
assert.match(previewHtml, /renderProposalPreviewHtml/);

const previewApi = read("app/api/admin/proposal-builder/[id]/preview/route.ts");
assert.match(previewApi, /getProposalPreviewHtmlForOperator/);

const operatorHandoff = read("lib/proposal-lifecycle/operator-handoff.ts");
assert.match(operatorHandoff, /emitLifecycleOperatorHandoff/);
assert.match(operatorHandoff, /processOperationalFlow/);
assert.match(operatorHandoff, /notifyLifecycleEvent/);

const acceptServices = read("lib/proposal-builder/services.ts");
assert.match(acceptServices, /emitLifecycleOperatorHandoff/);
assert.match(acceptServices, /flowKind: "proposal\.accepted"/);

const stripeTestSvc = read("lib/proposal-lifecycle/stripe-test/service.ts");
assert.match(stripeTestSvc, /emitLifecycleOperatorHandoff/);

const liveRecon = read("lib/proposal-lifecycle/live-stripe-reconciliation-service.ts");
assert.match(liveRecon, /emitLifecycleOperatorHandoff/);

console.log("verify:proposal-find-errors: OK\n");
