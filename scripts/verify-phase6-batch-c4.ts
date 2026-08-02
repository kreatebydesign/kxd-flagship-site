/**
 * Phase 6 Batch C4 — Local dogfood activation authorization verification.
 *
 * Static + pure-unit. Uses a temp cwd for activation file I/O.
 * Does NOT authorize production rollout.
 *
 * Run: npm run verify:phase6-batch-c4
 */
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { evaluateConnectAccess } from "../lib/connect/access";
import {
  buildConnectLocalActivationFromEnv,
  createDisabledConnectLocalActivationState,
  getConnectActivationSnapshot,
  getEffectiveConnectStaffAllowlist,
  isConnectEnvironmentAllowed,
  isConnectLocalActivationEnabled,
  isConnectProductionEnvironment,
  logConnectOpsEvent,
  readConnectLocalActivationState,
  writeConnectLocalActivationState,
} from "../lib/connect/activation";
import {
  isConnectKillSwitchActive,
  isConnectOperatorEnablementOn,
} from "../lib/connect/config";
import { isFeatureEnabled, isModuleEnabled } from "../lib/editions";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function check(label: string, pass: boolean, detail?: string) {
  console.log(
    pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`,
  );
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function dogfoodEnv(
  overrides: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: "test",
    VERCEL_ENV: undefined,
    KXD_CONNECT_KILL_SWITCH: undefined,
    KXD_CONNECT_ENABLED: "1",
    KXD_CONNECT_STAFF_DOGFOOD_EMAILS:
      "connect-a@kxd.local,connect-b@kxd.local",
    KXD_CONNECT_ORG_ALLOWLIST: "kxd",
    ...overrides,
  };
}

function baseAccess(
  overrides: Partial<Parameters<typeof evaluateConnectAccess>[0]> = {},
) {
  return evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "connect-a@kxd.local",
    organization: { key: "kxd", status: "active" },
    membership: { status: "active", role: "organization-member" },
    editionFeatureActive: false,
    env: dogfoodEnv(),
    ...overrides,
  });
}

async function main() {
  console.log("\nPhase 6 Batch C4 — Local dogfood activation verification\n");

  const required = [
    "lib/connect/activation/types.ts",
    "lib/connect/activation/environment.ts",
    "lib/connect/activation/local-state.ts",
    "lib/connect/activation/ops-log.ts",
    "lib/connect/activation/snapshot.ts",
    "lib/connect/activation/index.ts",
    "lib/connect/access.ts",
    "scripts/connect-local-activation.ts",
    "docs/PHASE-6-CONNECT-LOCAL-DOGFOOD-RUNBOOK.md",
    "docs/PHASE-6-KXD-CONNECT.md",
  ];
  for (const f of required) {
    check(`${f} exists`, existsSync(path.join(root, f)));
  }

  // ── Defaults OFF ───────────────────────────────────────────────────────────
  check(
    "edition feature kxd-connect disabled by default",
    isFeatureEnabled("kxd-connect") === false,
  );
  check("connect module disabled by default", isModuleEnabled("connect") === false);
  check(
    "operator enablement defaults off",
    isConnectOperatorEnablementOn({
      ...process.env,
      KXD_CONNECT_ENABLED: undefined,
    }) === false,
  );

  const tmp = mkdtempSync(path.join(tmpdir(), "kxd-connect-c4-"));
  try {
    const env = dogfoodEnv();
    const absent = readConnectLocalActivationState({ cwd: tmp, env });
    check("activation file absent ⇒ disabled", absent.enabled === false);
    check(
      "local activation defaults off",
      isConnectLocalActivationEnabled({ cwd: tmp, env }) === false,
    );

    const deniedNoActivation = baseAccess({
      cwd: tmp,
      env,
      // live resolution — do not inject activation
      localActivationEnabled: undefined,
      environmentAllowed: undefined,
    });
    check(
      "activation required (fail closed)",
      deniedNoActivation.allowed === false &&
        deniedNoActivation.reason === "local_activation_required",
    );

    // ── Enable / allowlist ───────────────────────────────────────────────────
    const enabledState = buildConnectLocalActivationFromEnv(env, {
      enabled: true,
    });
    writeConnectLocalActivationState(enabledState, { cwd: tmp, env });
    check(
      "local activation enable writes enabled=true",
      readConnectLocalActivationState({ cwd: tmp, env }).enabled === true,
    );

    const allowed = baseAccess({
      cwd: tmp,
      env,
      localActivationEnabled: undefined,
      environmentAllowed: undefined,
    });
    check(
      "activation succeeds for allowlisted staff",
      allowed.allowed === true,
    );

    const notAllowlisted = baseAccess({
      cwd: tmp,
      env,
      staffEmail: "outsider@example.com",
      localActivationEnabled: undefined,
      environmentAllowed: undefined,
    });
    check(
      "non-allowlisted staff denied",
      !notAllowlisted.allowed && notAllowlisted.reason === "not_staff_dogfood",
    );

    // Immediate allowlist revoke via file rewrite (no deploy / no cache)
    writeConnectLocalActivationState(
      {
        ...enabledState,
        staffEmails: ["connect-b@kxd.local"],
        enabled: true,
      },
      { cwd: tmp, env },
    );
    const revoked = baseAccess({
      cwd: tmp,
      env,
      staffEmail: "connect-a@kxd.local",
      localActivationEnabled: undefined,
      environmentAllowed: undefined,
    });
    check(
      "allowlist removal revokes immediately",
      !revoked.allowed && revoked.reason === "not_staff_dogfood",
    );
    // restore allowlist for further checks
    writeConnectLocalActivationState(enabledState, { cwd: tmp, env });

    // ── Portal / inactive org / membership ───────────────────────────────────
    const portal = baseAccess({
      cwd: tmp,
      env,
      subjectKind: "portal-user",
      staffEmail: null,
      localActivationEnabled: undefined,
      environmentAllowed: undefined,
    });
    check(
      "portal denied",
      !portal.allowed &&
        portal.reason === "portal_identity_not_supported_in_c0",
    );

    const inactiveMem = baseAccess({
      cwd: tmp,
      env,
      membership: { status: "disabled", role: "organization-member" },
      localActivationEnabled: undefined,
      environmentAllowed: undefined,
    });
    check(
      "inactive membership denied",
      !inactiveMem.allowed && inactiveMem.reason === "membership_disabled",
    );

    const inactiveOrg = baseAccess({
      cwd: tmp,
      env,
      organization: { key: "kxd", status: "inactive" },
      localActivationEnabled: undefined,
      environmentAllowed: undefined,
    });
    check(
      "inactive organization denied",
      !inactiveOrg.allowed && inactiveOrg.reason === "org_inactive",
    );

    // ── Rollback immediate ───────────────────────────────────────────────────
    writeConnectLocalActivationState(
      createDisabledConnectLocalActivationState({
        staffEmails: enabledState.staffEmails,
        organizationKeys: enabledState.organizationKeys,
      }),
      { cwd: tmp, env },
    );
    const afterDisable = baseAccess({
      cwd: tmp,
      env,
      localActivationEnabled: undefined,
      environmentAllowed: undefined,
    });
    check(
      "global/local disable blocks immediately",
      !afterDisable.allowed &&
        afterDisable.reason === "local_activation_required",
    );

    // Re-enable then kill switch
    writeConnectLocalActivationState(enabledState, { cwd: tmp, env });
    const killed = baseAccess({
      cwd: tmp,
      env: dogfoodEnv({ KXD_CONNECT_KILL_SWITCH: "1" }),
      localActivationEnabled: undefined,
      environmentAllowed: undefined,
    });
    check(
      "kill switch blocks immediately",
      !killed.allowed && killed.reason === "kill_switch",
    );
    check(
      "kill switch helper active",
      isConnectKillSwitchActive(dogfoodEnv({ KXD_CONNECT_KILL_SWITCH: "1" })),
    );

    // ── Environment / production defaults ────────────────────────────────────
    check(
      "production environment denied",
      isConnectEnvironmentAllowed({
        ...env,
        NODE_ENV: "production",
      }) === false,
    );
    check(
      "isConnectProductionEnvironment detects production",
      isConnectProductionEnvironment({ NODE_ENV: "production" }),
    );
    const prodDenied = baseAccess({
      cwd: tmp,
      env: dogfoodEnv({ NODE_ENV: "production" }),
      localActivationEnabled: undefined,
      environmentAllowed: undefined,
    });
    check(
      "production defaults deny Connect access",
      !prodDenied.allowed &&
        (prodDenied.reason === "environment_not_allowed" ||
          prodDenied.reason === "local_activation_required"),
    );

    let writeThrew = false;
    try {
      writeConnectLocalActivationState(enabledState, {
        cwd: tmp,
        env: dogfoodEnv({ NODE_ENV: "production" }),
      });
    } catch {
      writeThrew = true;
    }
    check("activation write unavailable in production", writeThrew);

    // ── No authorization cache (re-read file) ────────────────────────────────
    writeConnectLocalActivationState(enabledState, { cwd: tmp, env });
    const first = isConnectLocalActivationEnabled({ cwd: tmp, env });
    writeConnectLocalActivationState(
      createDisabledConnectLocalActivationState(),
      { cwd: tmp, env },
    );
    const second = isConnectLocalActivationEnabled({ cwd: tmp, env });
    check(
      "authorization cache cleared (re-read after disable)",
      first === true && second === false,
    );

    const effective = getEffectiveConnectStaffAllowlist({
      cwd: tmp,
      env: dogfoodEnv({
        KXD_CONNECT_STAFF_DOGFOOD_EMAILS: "env-only@kxd.local",
      }),
    });
    // disabled file with empty emails falls back to env
    check(
      "effective allowlist falls back to env when file empty",
      effective.has("env-only@kxd.local"),
    );

    logConnectOpsEvent(
      {
        type: "activation.status",
        summary: "c4 verifier ops log probe",
        meta: { probe: true },
      },
      { cwd: tmp, console: false },
    );
    check(
      "ops log written without message content fields",
      existsSync(path.join(tmp, ".connect/ops.log")) &&
        !readFileSync(path.join(tmp, ".connect/ops.log"), "utf8").includes(
          "message body",
        ),
    );

    const snap = getConnectActivationSnapshot({ cwd: tmp, env });
    check(
      "snapshot reports layers after disable",
      snap.localActivationEnabled === false &&
        snap.globalFeatureEnabled === true,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  // ── Navigation still absent ────────────────────────────────────────────────
  const shellTheme = existsSync(path.join(root, "lib/shell/theme.ts"))
    ? read("lib/shell/theme.ts")
    : "";
  check(
    "shell theme does not register Connect nav",
    !shellTheme.includes("/admin/connect"),
  );

  const statusRoute = read("app/api/admin/connect/status/route.ts");
  check(
    "status keeps uiAvailable false (no public exposure flag)",
    statusRoute.includes("uiAvailable: false") &&
      statusRoute.includes("messagingAvailable: false"),
  );

  const access = read("lib/connect/access.ts");
  check(
    "access documents C4 evaluation order",
    access.includes("Local operator activation") &&
      access.includes("Environment allows Connect"),
  );
  check(
    "access has no memo/cache of decisions",
    !access.includes("useMemo") && !access.includes("unstable_cache"),
  );

  const operator = read("scripts/connect-local-activation.ts");
  check(
    "operator refuses production",
    operator.includes("production environment") &&
      operator.includes("LOCAL-ONLY"),
  );
  check(
    "operator is idempotent enable/disable",
    operator.includes("idempotent") || operator.includes("Idempotent"),
  );

  const gitignore = read(".gitignore");
  check(".connect/ is gitignored", gitignore.includes(".connect/"));

  const docs = read("docs/PHASE-6-KXD-CONNECT.md");
  check(
    "docs describe local dogfood activation (not production-ready)",
    docs.includes("Batch C4") &&
      docs.includes("local dogfood") &&
      !docs.includes("Connect is production-ready") &&
      !docs.includes("generally available"),
  );

  const runbook = read("docs/PHASE-6-CONNECT-LOCAL-DOGFOOD-RUNBOOK.md");
  check(
    "runbook has activate/deactivate/rollback commands",
    runbook.includes("connect:local-enable") &&
      runbook.includes("connect:local-disable") &&
      runbook.includes("Rollback"),
  );

  console.log("\nPhase 6 Batch C4 verification passed.\n");
}

main().catch((err) => {
  console.error("\nPhase 6 Batch C4 verification FAILED\n");
  console.error(err);
  process.exit(1);
});
