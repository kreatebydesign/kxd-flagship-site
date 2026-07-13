/**
 * Phase 30B — Runtime contract verification.
 * No Tauri. No desktop environment. Deterministic Node + jsdom-free probes.
 *
 * Run: npm run verify:runtime-contract
 */

import {
  AUTH_CONTRACT,
  DATETIME_HYDRATION_NOTE,
  DEEP_LINK_ALLOWED_PREFIXES,
  EXECUTIVE_INTELLIGENCE_FOOTER_TIMEZONE_DEBT,
  FORBIDDEN_BRIDGE_CAPABILITIES,
  KXD_APP_PROTOCOL,
  KXD_CAPABILITY_IDS,
  KXD_RUNTIME_CONTRACT_VERSION,
  NATIVE_BRIDGE_COMMANDS,
  NATIVE_BRIDGE_PROTOCOL_VERSION,
  SETTINGS_OWNERSHIP,
  SIGN_OUT_CONTRACT,
  WebRuntimeAdapter,
  clearRuntimeAdapter,
  deepLinkToBrowserHref,
  detectNativeBridgeHost,
  detectRuntimeKind,
  expectedCapabilitiesForKind,
  formatDateOnly,
  initializeRuntime,
  invokeNativeBridge,
  isCapabilityUsable,
  isDeepLinkAllowed,
  isMimeAllowed,
  isNativeBridgeCommand,
  mayAttemptBusinessMutation,
  mayMutateBusinessState,
  normalizeAppPath,
  parseDateOnly,
  parseDeepLink,
  registerRuntimeAdapter,
  resetRuntime,
  resolveConnectivity,
  resolvePresentationTimezone,
  sanitizeErrorDetails,
  sanitizeFilename,
  toUtcIso,
  validateBridgeRequest,
  validateDownloadUrl,
  validateExternalUrl,
} from "../lib/runtime/index.ts";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log("\nPhase 30B — Runtime Contract\n");

// --- Detection (Node = web, no bridge) ---
console.log("Runtime detection");
assert(detectRuntimeKind() === "web", "Node/default kind is web");
assert(
  KXD_RUNTIME_CONTRACT_VERSION.startsWith("30B"),
  `contract version ${KXD_RUNTIME_CONTRACT_VERSION}`,
);

// --- Registration / initialize ---
console.log("\nRuntime registration");
resetRuntime();
clearRuntimeAdapter();
{
  const adapter = new WebRuntimeAdapter();
  registerRuntimeAdapter(adapter);
  const init = await adapter.initialize();
  assert(init.ok === true, "web adapter initializes");
  if (init.ok) {
    assert(init.value.kind === "web", "info.kind is web");
    assert(init.value.hasNativeBridge === false, "no native bridge on web");
    assert(
      init.value.contractVersion === KXD_RUNTIME_CONTRACT_VERSION,
      "contract version stamped",
    );
  }
  const caps = adapter.getCapabilities();
  assert(
    caps["open-external-url"].support === "unsupported" ||
      caps["open-external-url"].support === "supported",
    "open-external-url probed (no window → unsupported in Node)",
  );
  assert(
    caps["secure-storage"].support === "unsupported",
    "secure-storage unsupported on web",
  );
  assert(
    caps["native-menu"].support === "unsupported",
    "native-menu unsupported on web",
  );
  assert(
    caps.updater.support === "unsupported",
    "updater unsupported on web",
  );
  assert(
    caps["reveal-file"].support === "unsupported",
    "reveal-file unsupported on web",
  );
  const reveal = await adapter.revealFile({ path: "/tmp/x" });
  assert(reveal.ok === false && reveal.error.code === "unsupported", "reveal returns unsupported");
  const update = await adapter.checkForUpdate();
  assert(update.ok === false && update.error.code === "unsupported", "updater returns unsupported");
  const secure = await adapter.secureStorageGet({ key: "x" });
  assert(secure.ok === false && secure.error.code === "unsupported", "secure storage returns unsupported");
}

resetRuntime();
{
  const result = await initializeRuntime();
  assert(result.ok === true, "initializeRuntime() succeeds for web");
}
resetRuntime();

// --- Capability vocabulary ---
console.log("\nCapabilities");
assert(KXD_CAPABILITY_IDS.length === 17, "17 capability ids");
const webExpected = expectedCapabilitiesForKind("web");
assert(webExpected["secure-storage"] === "unsupported", "web expects no secure-storage");
assert(webExpected["deep-links"] === "unsupported", "web expects no deep-links host");
{
  const base = Object.fromEntries(
    KXD_CAPABILITY_IDS.map((id) => [
      id,
      {
        id,
        support: "unsupported" as const,
        permissionGranted: null as boolean | null,
      },
    ]),
  );
  const denied = {
    ...base,
    notifications: {
      id: "notifications" as const,
      support: "requires-permission" as const,
      permissionGranted: false,
    },
  } as ReturnType<WebRuntimeAdapter["getCapabilities"]>;
  assert(
    isCapabilityUsable(denied, "notifications") === false,
    "requires-permission without grant is not usable",
  );
  const granted = {
    ...base,
    notifications: {
      id: "notifications" as const,
      support: "requires-permission" as const,
      permissionGranted: true,
    },
  } as ReturnType<WebRuntimeAdapter["getCapabilities"]>;
  assert(
    isCapabilityUsable(granted, "notifications") === true,
    "requires-permission with grant is usable",
  );
}

// --- External links ---
console.log("\nExternal URL validation");
{
  const okHttps = validateExternalUrl({ url: "https://kreatebydesign.com/x" });
  assert(okHttps.ok === true, "https URL accepted");
  const blocked = validateExternalUrl({ url: "javascript:alert(1)" });
  assert(blocked.ok === false, "javascript: rejected");
  const data = validateExternalUrl({ url: "data:text/html,hi" });
  assert(data.ok === false, "data: rejected");
  const file = validateExternalUrl({ url: "file:///etc/passwd" });
  assert(file.ok === false, "file: rejected");
  const restricted = validateExternalUrl({
    url: "https://evil.example",
    restrictToKnownHosts: true,
  });
  assert(restricted.ok === false, "unknown host rejected when restricted");
  const known = validateExternalUrl({
    url: "https://portal.kreatebydesign.com/portal",
    restrictToKnownHosts: true,
  });
  assert(known.ok === true, "known KXD host accepted when restricted");
}

// --- Deep links ---
console.log("\nDeep-link validation");
{
  assert(KXD_APP_PROTOCOL === "kxdos", "protocol is kxdos");
  const good = parseDeepLink("kxdos://operations/today");
  assert(good.ok === true, "operations deep link parses");
  if (good.ok) {
    assert(
      good.value.path === "/admin/operations/today",
      `mapped path ${good.value.path}`,
    );
    assert(isDeepLinkAllowed(good.value.path), "path allowlisted");
    const href = deepLinkToBrowserHref(good.value, "https://kreatebydesign.com");
    assert(
      href === "https://kreatebydesign.com/admin/operations/today",
      "browser fallback href",
    );
  }
  const work = parseDeepLink("kxdos://work/42");
  assert(work.ok === true && work.value.path === "/admin/work/42", "work deep link");
  const appForm = parseDeepLink("kxdos://app/admin/operations/focus");
  assert(
    appForm.ok === true && appForm.value.path === "/admin/operations/focus",
    "app-host deep link",
  );
  const portal = parseDeepLink("kxdos://app/portal/dashboard");
  assert(portal.ok === false, "portal path rejected from Studio deep links");
  const badProto = parseDeepLink("https://kreatebydesign.com/admin/operations");
  assert(badProto.ok === false, "https not accepted as kxdos deep link");
  const traversal = parseDeepLink("kxdos://app/admin/operations/../../etc/passwd");
  assert(traversal.ok === false, "path traversal rejected");
  const encodedTraversal = parseDeepLink(
    "kxdos://app/admin/operations/%2e%2e/%2e%2e/etc/passwd",
  );
  assert(encodedTraversal.ok === false, "encoded path traversal rejected");
  const malformed = parseDeepLink("kxdos://app/admin/operations/%zz");
  assert(malformed.ok === false, "malformed percent-encoding rejected");
  const unsafeId = parseDeepLink("kxdos://work/42$evil");
  assert(unsafeId.ok === false, "unsafe work id characters rejected");
  const encodedDotId = parseDeepLink("kxdos://work/id%2e%2e");
  assert(encodedDotId.ok === false, "encoded dots in work id rejected");
  const workId = parseDeepLink("kxdos://work/42");
  assert(workId.ok === true && workId.value.path === "/admin/work/42", "numeric work id ok");
  assert(
    DEEP_LINK_ALLOWED_PREFIXES.includes("/admin/operations"),
    "operations prefix listed",
  );
}

console.log("\nApp path normalization");
{
  assert(normalizeAppPath("/admin/operations").ok === true, "valid app path");
  assert(normalizeAppPath("admin/operations").ok === false, "relative rejected");
  assert(normalizeAppPath("//evil").ok === false, "protocol-relative rejected");
  assert(normalizeAppPath("/a/../b").ok === false, "traversal segment rejected");
}

// --- Timezone precedence ---
console.log("\nTimezone precedence");
{
  const r1 = resolvePresentationTimezone({
    savedPreference: "America/New_York",
    desktopSystemTimezone: "Europe/London",
    browserTimezone: "Asia/Tokyo",
    configuredDefault: "America/Los_Angeles",
  });
  assert(r1.timeZone === "America/New_York" && r1.source === "saved-preference", "saved wins");

  const r2 = resolvePresentationTimezone({
    desktopSystemTimezone: "Europe/London",
    browserTimezone: "Asia/Tokyo",
    configuredDefault: "America/Los_Angeles",
  });
  assert(r2.timeZone === "Europe/London" && r2.source === "desktop-system", "desktop next");

  const r3 = resolvePresentationTimezone({
    browserTimezone: "Asia/Tokyo",
    configuredDefault: "America/Los_Angeles",
  });
  assert(r3.timeZone === "Asia/Tokyo" && r3.source === "browser", "browser next");

  const r4 = resolvePresentationTimezone({
    configuredDefault: "America/Los_Angeles",
  });
  assert(
    r4.timeZone === "America/Los_Angeles" && r4.source === "configured-default",
    "configured default next",
  );

  const r5 = resolvePresentationTimezone({
    savedPreference: "Not/AZone",
    configuredDefault: "Also/Bad",
  });
  assert(r5.timeZone === "UTC" && r5.source === "utc", "UTC fallback");

  const iso = toUtcIso(new Date("2026-07-12T20:00:00.000Z"));
  assert(iso === "2026-07-12T20:00:00.000Z", "toUtcIso stable");
  assert(
    EXECUTIVE_INTELLIGENCE_FOOTER_TIMEZONE_DEBT.id === "ei-footer-timezone",
    "EI footer timezone debt documented",
  );
}

// --- Connectivity ---
console.log("\nConnectivity");
{
  assert(resolveConnectivity({ navigatorOnline: true }) === "online", "online");
  assert(resolveConnectivity({ navigatorOnline: false }) === "offline", "offline");
  assert(
    resolveConnectivity({ navigatorOnline: true, reconnecting: true }) ===
      "reconnecting",
    "reconnecting",
  );
  assert(
    resolveConnectivity({
      navigatorOnline: true,
      serverReachable: false,
    }) === "degraded",
    "degraded when backend unreachable",
  );
  assert(resolveConnectivity({}) === "unknown", "unknown when no signals");
  assert(mayMutateBusinessState("online") === true, "strict mutate online");
  assert(mayMutateBusinessState("unknown") === false, "strict mutate unknown false");
  assert(mayMutateBusinessState("offline") === false, "no mutations offline");
  assert(mayMutateBusinessState("degraded") === false, "no mutations degraded");
  assert(mayAttemptBusinessMutation("online") === true, "attempt online");
  assert(mayAttemptBusinessMutation("unknown") === true, "attempt unknown (server authority)");
  assert(mayAttemptBusinessMutation("offline") === false, "no attempt offline");
  assert(mayAttemptBusinessMutation("degraded") === false, "no attempt degraded");
  assert(mayAttemptBusinessMutation("reconnecting") === false, "no attempt reconnecting");
}

// --- Filename sanitization ---
console.log("\nFilename sanitization");
{
  assert(sanitizeFilename("report.pdf") === "report.pdf", "clean name");
  assert(
    sanitizeFilename("a/../b:c*.pdf").includes("_") ||
      !sanitizeFilename("a/../b:c*.pdf").includes(".."),
    "unsafe chars / traversal neutralized",
  );
  assert(sanitizeFilename("../../../etc/passwd") === "passwd", "absolute path → basename");
  assert(sanitizeFilename("C:\\\\Windows\\\\file.txt") === "file.txt", "windows path → basename");
  assert(sanitizeFilename("con.txt").startsWith("_"), "windows reserved guarded");
  assert(sanitizeFilename("   ") === "download", "empty → fallback");
  assert(sanitizeFilename("report\0.pdf") !== "report\0.pdf", "null byte neutralized");
  assert(isMimeAllowed("application/pdf", ["application/pdf"]) === true, "mime allow");
  assert(isMimeAllowed("image/png", ["image/*"]) === true, "mime wildcard");
  assert(isMimeAllowed("text/html", ["application/pdf"]) === false, "mime deny");
  assert(
    isMimeAllowed(null, ["application/pdf"]) === false,
    "mime does not trust missing type / extension alone",
  );
  const dl = validateDownloadUrl("/api/admin/export");
  assert(dl.ok === true, "relative download path ok");
  const badDl = validateDownloadUrl("javascript:x");
  assert(badDl.ok === false, "bad download url rejected");
}

// --- Native bridge contract ---
console.log("\nNative bridge contract");
{
  assert(NATIVE_BRIDGE_PROTOCOL_VERSION === "30B.1", "bridge protocol version");
  assert(NATIVE_BRIDGE_COMMANDS.includes("ping"), "ping allowlisted");
  assert(isNativeBridgeCommand("shell-exec") === false, "shell-exec not a command");
  assert(
    FORBIDDEN_BRIDGE_CAPABILITIES.includes("neon-direct"),
    "neon-direct forbidden",
  );
  const valid = validateBridgeRequest({
    protocolVersion: NATIVE_BRIDGE_PROTOCOL_VERSION,
    command: "ping",
    requestId: "1",
  });
  assert(valid.ok === true, "valid bridge request");
  const badCmd = validateBridgeRequest({
    protocolVersion: NATIVE_BRIDGE_PROTOCOL_VERSION,
    command: "shell-exec" as never,
    requestId: "1",
  });
  assert(badCmd.ok === false, "non-allowlisted command rejected");
  const badVer = validateBridgeRequest({
    protocolVersion: "0.0",
    command: "ping",
    requestId: "1",
  });
  assert(badVer.ok === false, "bad protocol version rejected");
  const absent = await invokeNativeBridge({
    protocolVersion: NATIVE_BRIDGE_PROTOCOL_VERSION,
    command: "ping",
    requestId: "absent-1",
  });
  assert(
    absent.ok === false && absent.error.code === "bridge-unavailable",
    "absent bridge → structured unavailable",
  );
  assert(detectNativeBridgeHost().present === false, "no bridge host in Node");
}

// --- Detection trust ---
console.log("\nDetection trust");
{
  resetRuntime();
  assert(detectRuntimeKind() === "web", "default kind web without adapter");
  // Spoofing a global must not elevate kind (no window in Node; document via contract).
  assert(detectNativeBridgeHost().present === false, "bridge hint absent on server");
  await initializeRuntime();
  assert(detectRuntimeKind() === "web", "web adapter keeps kind web");
  resetRuntime();
}

// --- Date-only ---
console.log("\nDate-only safety");
{
  const ok = parseDateOnly("2026-07-12");
  assert(ok.ok === true, "valid date-only");
  const bad = parseDateOnly("2026-13-40");
  assert(bad.ok === false, "invalid calendar day rejected");
  const fmt = formatDateOnly("2026-07-12");
  assert(fmt.ok === true && fmt.value.includes("2026"), "date-only formats without TZ shift");
  assert(DATETIME_HYDRATION_NOTE.length > 20, "hydration note documented");
}

// --- Error sanitization ---
console.log("\nError sanitization");
{
  const cleaned = sanitizeErrorDetails({
    path: "/admin/operations/today",
    secret: "nope",
    TOKEN: "x",
    reason: "unsafe-segment",
    leaked: "/etc/passwd",
  });
  assert(cleaned?.path === "/admin/operations/today", "app path detail retained");
  assert(cleaned?.reason === "unsafe-segment", "reason retained");
  assert(cleaned?.leaked === undefined, "filesystem path stripped");
  assert(cleaned?.secret === undefined, "unknown keys stripped");
}

// --- Auth and settings ownership ---
console.log("\nAuth and settings ownership");
{
  assert(AUTH_CONTRACT.forbidPasswordStorage === true, "no password storage");
  assert(AUTH_CONTRACT.forbidSessionInLocalStorage === true, "no session in localStorage");
  assert(SIGN_OUT_CONTRACT.mutateBusinessRecords === false, "sign-out does not mutate business");
  assert(SETTINGS_OWNERSHIP.length === 4, "four settings scopes");
  assert(
    SETTINGS_OWNERSHIP.some((s) => s.scope === "secure-device" && s.mayContainSecrets),
    "secure-device may hold secrets",
  );
  assert(
    SETTINGS_OWNERSHIP.some((s) => s.scope === "device" && !s.mayContainSecrets),
    "device settings are non-secret",
  );
}

console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
