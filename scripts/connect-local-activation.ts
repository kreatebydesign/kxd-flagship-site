/**
 * Phase 6 Batch C4 — LOCAL-ONLY Connect dogfood activation operator.
 *
 * Commands:
 *   npm run connect:local-status
 *   npm run connect:local-enable
 *   npm run connect:local-disable
 *
 * Unavailable in production. Never enables Connect automatically.
 * Never pushes, deploys, or mutates production data.
 *
 * Enable is intentional and idempotent: writes `.connect/local-activation.json`
 * from current env allowlists. Disable sets enabled=false immediately
 * (re-read on next request — no deployment required).
 */

import {
  assertConnectLocalFixtureTarget,
  formatConnectLocalDbTarget,
  resolveConnectLocalDbTarget,
} from "../lib/connect/local-fixture-guard";
import {
  buildConnectLocalActivationFromEnv,
  createDisabledConnectLocalActivationState,
  getConnectActivationSnapshot,
  isConnectProductionEnvironment,
  logConnectOpsEvent,
  readConnectLocalActivationState,
  resolveConnectLocalActivationPath,
  writeConnectLocalActivationState,
} from "../lib/connect/activation";
import {
  isConnectKillSwitchActive,
  isConnectOperatorEnablementOn,
} from "../lib/connect/config";

type Command = "status" | "enable" | "disable";

function parseCommand(argv: string[]): Command {
  const raw = (argv[2] ?? "status").trim().toLowerCase();
  if (raw === "status" || raw === "enable" || raw === "disable") return raw;
  throw new Error(
    `Unknown command "${raw}". Use: status | enable | disable`,
  );
}

function assertOperatorEnvironment(): void {
  if (isConnectProductionEnvironment()) {
    throw new Error(
      "Refusing Connect local activation operator: production environment. " +
        "Local dogfood activation is unavailable in production.",
    );
  }
  const target = resolveConnectLocalDbTarget();
  assertConnectLocalFixtureTarget(target);
}

function printSnapshot(label: string): void {
  const snap = getConnectActivationSnapshot();
  const state = readConnectLocalActivationState();
  console.log(`\nKXD Connect — local dogfood activation (${label})\n`);
  console.log(`  activation file: ${resolveConnectLocalActivationPath()}`);
  console.log(`  db target: ${formatConnectLocalDbTarget(resolveConnectLocalDbTarget())}`);
  console.log(`  killSwitch: ${snap.killSwitch}`);
  console.log(`  operatorEnablement (KXD_CONNECT_ENABLED): ${snap.operatorEnablement}`);
  console.log(`  editionFeatureActive: ${snap.editionFeatureActive}`);
  console.log(`  globalFeatureEnabled: ${snap.globalFeatureEnabled}`);
  console.log(`  environmentAllowed: ${snap.environmentAllowed}`);
  console.log(`  localActivationEnabled: ${snap.localActivationEnabled}`);
  console.log(`  staffAllowlistSize: ${snap.staffAllowlistSize}`);
  console.log(`  organizationAllowlistSize: ${snap.organizationAllowlistSize}`);
  console.log(`  dogfoodLayersReady: ${snap.dogfoodLayersReady}`);
  console.log(`  state.updatedAt: ${state.updatedAt}`);
  console.log(
    `  state.staffEmails: ${state.staffEmails.length ? state.staffEmails.join(", ") : "(none)"}`,
  );
  console.log(
    `  state.organizationKeys: ${
      state.organizationKeys.length
        ? state.organizationKeys.join(", ")
        : "(none)"
    }`,
  );
  if (!isConnectOperatorEnablementOn()) {
    console.log(
      "\n  note: Set KXD_CONNECT_ENABLED=1 in .env.local (restart Next after env changes).",
    );
  }
  if (isConnectKillSwitchActive()) {
    console.log("\n  warning: KXD_CONNECT_KILL_SWITCH=1 — Connect is globally denied.");
  }
  console.log("");
}

function enable(): void {
  assertOperatorEnvironment();

  if (!isConnectOperatorEnablementOn()) {
    throw new Error(
      "Refusing enable: KXD_CONNECT_ENABLED is not 1. " +
        "Set it in .env.local, restart the Next.js process, then re-run enable.",
    );
  }
  if (isConnectKillSwitchActive()) {
    throw new Error(
      "Refusing enable: KXD_CONNECT_KILL_SWITCH=1. Clear the kill switch first.",
    );
  }

  const next = buildConnectLocalActivationFromEnv(process.env, {
    enabled: true,
    note: "local-dogfood-operator-enable",
  });

  if (next.staffEmails.length === 0) {
    throw new Error(
      "Refusing enable: KXD_CONNECT_STAFF_DOGFOOD_EMAILS is empty (fail closed).",
    );
  }
  if (next.organizationKeys.length === 0) {
    throw new Error(
      "Refusing enable: KXD_CONNECT_ORG_ALLOWLIST is empty (fail closed).",
    );
  }

  const written = writeConnectLocalActivationState(next);
  logConnectOpsEvent({
    type: "activation.enabled",
    summary: "Local Connect dogfood activation enabled",
    meta: {
      staffAllowlistSize: written.staffEmails.length,
      organizationAllowlistSize: written.organizationKeys.length,
      idempotent: true,
    },
  });
  printSnapshot("enable");
}

function disable(): void {
  assertOperatorEnvironment();
  const prior = readConnectLocalActivationState();
  const written = writeConnectLocalActivationState(
    createDisabledConnectLocalActivationState({
      staffEmails: prior.staffEmails,
      organizationKeys: prior.organizationKeys,
      note: "local-dogfood-operator-disable",
    }),
  );
  logConnectOpsEvent({
    type: "activation.disabled",
    summary: "Local Connect dogfood activation disabled",
    meta: {
      staffAllowlistSize: written.staffEmails.length,
      organizationAllowlistSize: written.organizationKeys.length,
      idempotent: true,
    },
  });
  printSnapshot("disable");
}

function status(): void {
  assertOperatorEnvironment();
  logConnectOpsEvent({
    type: "activation.status",
    summary: "Local Connect dogfood activation status inspected",
    meta: {
      localActivationEnabled: readConnectLocalActivationState().enabled,
    },
  });
  printSnapshot("status");
}

async function main() {
  const command = parseCommand(process.argv);
  if (command === "enable") enable();
  else if (command === "disable") disable();
  else status();
}

main().catch((err) => {
  console.error(
    "\n[connect:local-activation] failed:",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
