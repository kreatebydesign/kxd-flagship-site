/**
 * Phase 34B activation QA — creates/cleans temporary Primal inventory fixtures.
 * Run: KXD_SERVER_ONLY_SHIM=1 tsx --import ./scripts/shims/register-server-only.mjs scripts/qa-client-inventory-activation.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getPayload } from "payload";
import config from "../payload.config";
import {
  createInventoryVehicle,
  duplicateInventoryVehicle,
  listInventoryForClient,
  listPublicInventory,
  updateInventoryVehicle,
} from "../lib/inventory/server";
import { INVENTORY_COLLECTION } from "../lib/inventory/constants";
import { PRIMAL_CLIENT_SLUG } from "../lib/ces/profile/primal";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const QA_PREFIX = "kxd-qa-34b";
const QA_EMAIL = "inventory.qa.34b@kxd.local";
const QA_PASSWORD = "InventoryQa34b!";
const COOKIE_JAR = "/tmp/kxd-qa-34b-cookies.txt";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
  console.log(`  ✔ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
  console.log(`  ✘ ${name}${detail ? ` — ${detail}` : ""}`);
}

function cookieHeaderFromJar(path: string): string {
  try {
    const lines = readFileSync(path, "utf8").split("\n");
    const parts: string[] = [];
    for (const line of lines) {
      if (!line || line.startsWith("#")) continue;
      const cols = line.split("\t");
      if (cols.length >= 7) parts.push(`${cols[5]}=${cols[6]}`);
    }
    return parts.join("; ");
  } catch {
    return "";
  }
}

async function http(
  path: string,
  init?: RequestInit & { jar?: boolean },
): Promise<{ status: number; json?: any; text: string; headers: Headers }> {
  const headers = new Headers(init?.headers);
  if (init?.jar) {
    const cookie = cookieHeaderFromJar(COOKIE_JAR);
    if (cookie) headers.set("cookie", cookie);
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: res.status, json, text, headers: res.headers };
}

async function ensureQaPortalUser(
  payload: Awaited<ReturnType<typeof getPayload>>,
  clientId: number,
) {
  const existing = await payload.find({
    collection: "portal-users" as never,
    where: { email: { equals: QA_EMAIL } } as never,
    limit: 1,
    overrideAccess: true,
  });
  const welcomeCompletedAt = new Date().toISOString();
  if (existing.docs.length) {
    await payload.update({
      collection: "portal-users" as never,
      id: (existing.docs[0] as { id: number }).id,
      data: {
        email: QA_EMAIL,
        displayName: "Inventory QA 34B",
        client: clientId,
        password: QA_PASSWORD,
        active: true,
        welcomeCompletedAt,
      } as never,
      overrideAccess: true,
    });
    return (existing.docs[0] as { id: number }).id;
  }
  const created = await payload.create({
    collection: "portal-users" as never,
    data: {
      email: QA_EMAIL,
      displayName: "Inventory QA 34B",
      client: clientId,
      password: QA_PASSWORD,
      active: true,
      welcomeCompletedAt,
    } as never,
    overrideAccess: true,
  });
  return (created as { id: number }).id;
}

async function cleanupQaVehicles(
  payload: Awaited<ReturnType<typeof getPayload>>,
  clientId: number,
) {
  const found = await payload.find({
    collection: INVENTORY_COLLECTION as never,
    where: {
      and: [
        { client: { equals: clientId } },
        { slug: { contains: QA_PREFIX } },
      ],
    } as never,
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });
  for (const doc of found.docs) {
    await payload.delete({
      collection: INVENTORY_COLLECTION as never,
      id: (doc as { id: number }).id,
      overrideAccess: true,
    });
  }
  return found.docs.length;
}

async function main() {
  console.log("\nPhase 34B — activation QA\n");
  writeFileSync(COOKIE_JAR, "");

  const payload = await getPayload({ config });

  const primal = await payload.find({
    collection: "clients",
    where: { slug: { equals: PRIMAL_CLIENT_SLUG } },
    limit: 1,
    overrideAccess: true,
  });
  if (!primal.docs.length) throw new Error("Primal client missing");
  const primalId = (primal.docs[0] as { id: number }).id;

  // Entitlement checks
  const profiles = await payload.find({
    collection: "client-experience-profiles" as never,
    limit: 100,
    depth: 1,
    overrideAccess: true,
  });
  let primalHasInventory = false;
  let otherInventoryCount = 0;
  for (const doc of profiles.docs as Array<Record<string, unknown>>) {
    const client = doc.client;
    const clientId =
      typeof client === "object" && client && "id" in client
        ? Number((client as { id: number }).id)
        : Number(client);
    const modules = Array.isArray(doc.enabledModules)
      ? (doc.enabledModules as string[])
      : [];
    if (clientId === primalId && modules.includes("inventory")) {
      primalHasInventory = true;
    }
    if (clientId !== primalId && modules.includes("inventory")) {
      otherInventoryCount += 1;
    }
  }
  if (primalHasInventory) pass("Primal CES profile includes inventory");
  else fail("Primal CES profile includes inventory");
  if (otherInventoryCount === 0) pass("No other client has inventory entitlement");
  else fail("No other client has inventory entitlement", `count=${otherInventoryCount}`);

  // Package defaults
  const packageSrc = readFileSync(
    join(process.cwd(), "lib/client-launch-wizard/packages/resolve.ts"),
    "utf8",
  );
  if (!packageSrc.includes('"inventory"') && !packageSrc.includes("'inventory'")) {
    pass("Launch package resolver does not default inventory");
  } else {
    fail("Launch package resolver does not default inventory");
  }

  await cleanupQaVehicles(payload, primalId);
  await ensureQaPortalUser(payload, primalId);

  // Login as Primal QA user
  const loginRes = await fetch(`${BASE}/api/portal/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  const setCookie = loginRes.headers.getSetCookie?.() ?? [];
  const cookieParts = setCookie.map((c) => c.split(";")[0]).filter(Boolean);
  // Node fetch may expose getSetCookie; fall back to set-cookie
  if (!cookieParts.length) {
    const raw = loginRes.headers.get("set-cookie");
    if (raw) cookieParts.push(raw.split(";")[0]);
  }
  writeFileSync(
    COOKIE_JAR,
    `# Netscape HTTP Cookie File\n${cookieParts
      .map((part) => {
        const [name, ...rest] = part.split("=");
        const value = rest.join("=");
        return `localhost\tFALSE\t/\tFALSE\t0\t${name}\t${value}`;
      })
      .join("\n")}\n`,
  );
  const loginJson = await loginRes.json().catch(() => ({}));
  if (loginRes.ok && loginJson.ok) pass("Primal QA portal login");
  else fail("Primal QA portal login", `${loginRes.status} ${JSON.stringify(loginJson)}`);

  // Portal page access
  const inventoryPage = await http("/portal/inventory", { jar: true, redirect: "manual" });
  if (inventoryPage.status === 200 && /Inventory|Add vehicle|No vehicles|listings/i.test(inventoryPage.text)) {
    pass("Portal inventory page accessible for Primal", `status=${inventoryPage.status}`);
  } else if (inventoryPage.status >= 300 && inventoryPage.status < 400) {
    fail(
      "Portal inventory page accessible for Primal",
      `redirect ${inventoryPage.status} ${inventoryPage.headers.get("location")}`,
    );
  } else {
    fail("Portal inventory page accessible for Primal", `status=${inventoryPage.status}`);
  }

  const newPage = await http("/portal/inventory/new", { jar: true, redirect: "manual" });
  if (newPage.status === 200) pass("Portal add-vehicle page loads");
  else fail("Portal add-vehicle page loads", `status=${newPage.status}`);

  // Unauthenticated portal API
  const unauth = await http("/api/portal/inventory");
  if (unauth.status === 401) pass("Portal inventory API requires auth");
  else fail("Portal inventory API requires auth", `status=${unauth.status}`);

  // Validation
  const badCreate = await http("/api/portal/inventory", {
    method: "POST",
    jar: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "", make: "", model: "" }),
  });
  if (badCreate.status >= 400) pass("Validation rejects incomplete vehicle");
  else fail("Validation rejects incomplete vehicle", JSON.stringify(badCreate.json));

  // Tiny 1x1 PNG
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const form = new FormData();
  form.append("file", new Blob([png], { type: "image/png" }), "qa-primary.png");
  form.append("alt", "QA primary");
  const uploadRes = await fetch(`${BASE}/api/portal/inventory/upload`, {
    method: "POST",
    headers: { cookie: cookieHeaderFromJar(COOKIE_JAR) },
    body: form,
  });
  const uploadJson = await uploadRes.json();
  if (uploadRes.ok && uploadJson.ok && uploadJson.media?.id) {
    pass("Primary image upload", `mediaId=${uploadJson.media.id} url=${uploadJson.media.url}`);
  } else {
    fail("Primary image upload", JSON.stringify(uploadJson));
  }

  const form2 = new FormData();
  form2.append("file", new Blob([png], { type: "image/png" }), "qa-gallery.png");
  form2.append("alt", "QA gallery");
  const upload2 = await fetch(`${BASE}/api/portal/inventory/upload`, {
    method: "POST",
    headers: { cookie: cookieHeaderFromJar(COOKIE_JAR) },
    body: form2,
  });
  const upload2Json = await upload2.json();
  if (upload2.ok && upload2Json.ok) pass("Gallery image upload", `mediaId=${upload2Json.media?.id}`);
  else fail("Gallery image upload", JSON.stringify(upload2Json));

  const createRes = await http("/api/portal/inventory", {
    method: "POST",
    jar: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "QA 34B Radical SR3 XX",
      slug: `${QA_PREFIX}-sr3-xx`,
      year: 2024,
      make: "Radical",
      model: "SR3 XX",
      trim: "Sport",
      condition: "new",
      listingStatus: "draft",
      price: 129000,
      priceDisplayMode: "exact",
      mileage: 120,
      vin: "QA34BVINPRIVATE999",
      stockNumber: "QA-34B-001",
      summary: "Activation QA vehicle",
      description: "Temporary fixture for Phase 34B QA.",
      specifications: [{ label: "Engine", value: "2.0L" }],
      highlights: ["QA fixture"],
      primaryImageId: uploadJson.media?.id ?? null,
      galleryImageIds: upload2Json.media?.id ? [upload2Json.media.id] : [],
      sortOrder: 10,
      featured: true,
    }),
  });
  const vehicleId = createRes.json?.vehicle?.id as number | undefined;
  if (createRes.status < 300 && createRes.json?.ok && vehicleId) {
    pass("Create vehicle via portal API", `id=${vehicleId}`);
  } else {
    fail("Create vehicle via portal API", JSON.stringify(createRes.json));
  }

  // Edit price/display mode + sort
  if (vehicleId) {
    const edit = await http(`/api/portal/inventory/${vehicleId}`, {
      method: "PATCH",
      jar: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: 125500,
        priceDisplayMode: "contact",
        sortOrder: 3,
      }),
    });
    if (
      edit.json?.ok &&
      edit.json.vehicle?.price === 125500 &&
      edit.json.vehicle?.priceDisplayMode === "contact" &&
      edit.json.vehicle?.sortOrder === 3
    ) {
      pass("Edit price, display mode, and sort order");
    } else {
      fail("Edit price, display mode, and sort order", JSON.stringify(edit.json));
    }

    if (edit.json?.preview == null) {
      pass("Draft vehicle public preview is null (not listable)");
    } else {
      fail("Draft vehicle public preview is null (not listable)", JSON.stringify(edit.json.preview));
    }

    const availablePreview = await http(`/api/portal/inventory/${vehicleId}/status`, {
      method: "POST",
      jar: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingStatus: "available" }),
    });
    const preview = availablePreview.json?.preview;
    if (
      preview &&
      !("vin" in preview) &&
      !("section" in preview) &&
      preview.inventoryGroup === "new" &&
      preview.listingStatus === "available"
    ) {
      pass("Public preview shape omits VIN and derives group");
    } else {
      fail("Public preview shape omits VIN and derives group", JSON.stringify(preview));
    }
  }

  // Status transitions + public visibility fixtures
  const statusFixtures: Array<{
    slug: string;
    status: string;
    condition: "new" | "used";
    expectPublic: boolean;
    expectGroup?: string;
  }> = [
    { slug: `${QA_PREFIX}-available`, status: "available", condition: "used", expectPublic: true, expectGroup: "used" },
    { slug: `${QA_PREFIX}-pending`, status: "pending", condition: "new", expectPublic: true, expectGroup: "new" },
    { slug: `${QA_PREFIX}-coming`, status: "coming_soon", condition: "used", expectPublic: true, expectGroup: "coming_soon" },
    { slug: `${QA_PREFIX}-hidden`, status: "hidden", condition: "new", expectPublic: false },
    { slug: `${QA_PREFIX}-sold`, status: "sold", condition: "used", expectPublic: false },
    { slug: `${QA_PREFIX}-draft2`, status: "draft", condition: "new", expectPublic: false },
  ];

  const createdIds: number[] = vehicleId ? [vehicleId] : [];
  for (const fixture of statusFixtures) {
    const created = await createInventoryVehicle(payload, {
      clientId: primalId,
      actor: QA_EMAIL,
      data: {
        title: `QA ${fixture.status}`,
        slug: fixture.slug,
        year: 2023,
        make: "Radical",
        model: "QA",
        condition: fixture.condition,
        listingStatus: fixture.status as never,
        price: 1000,
        priceDisplayMode: "exact",
        vin: "SHOULD_STAY_PRIVATE",
        sortOrder: 20,
        primaryImageId: uploadJson.media?.id ?? null,
      },
    });
    if (created.ok) createdIds.push(created.vehicle.id);
    else fail(`Create fixture ${fixture.slug}`, created.message);
  }

  if (vehicleId) {
    for (const status of ["available", "pending", "sold", "hidden", "coming_soon", "draft"] as const) {
      const res = await http(`/api/portal/inventory/${vehicleId}/status`, {
        method: "POST",
        jar: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingStatus: status }),
      });
      if (!(res.json?.ok && res.json.vehicle?.listingStatus === status)) {
        fail(`Status change → ${status}`, JSON.stringify(res.json));
      }
    }
    pass("Status changes across all listing statuses");

    const dup = await http(`/api/portal/inventory/${vehicleId}/duplicate`, {
      method: "POST",
      jar: true,
    });
    if (dup.json?.ok && dup.json.vehicle?.listingStatus === "draft" && !dup.json.vehicle?.vin) {
      pass("Duplicate vehicle creates draft without VIN");
      createdIds.push(dup.json.vehicle.id);
    } else {
      fail("Duplicate vehicle creates draft without VIN", JSON.stringify(dup.json));
    }
  }

  // Domain ordering
  const listed = await listInventoryForClient(payload, primalId);
  const qaListed = listed.filter((v) => v.slug.includes(QA_PREFIX));
  const sorted = [...qaListed].sort((a, b) => a.sortOrder - b.sortOrder);
  if (JSON.stringify(qaListed.map((v) => v.id)) === JSON.stringify(sorted.map((v) => v.id))) {
    pass("Inventory list respects sortOrder");
  } else {
    fail("Inventory list respects sortOrder");
  }

  // Public API
  const publicList = await http(`/api/public/inventory/${PRIMAL_CLIENT_SLUG}`);
  const vehicles = publicList.json?.vehicles ?? [];
  const statuses = new Set(vehicles.map((v: { listingStatus: string }) => v.listingStatus));
  const forbidden = ["draft", "hidden", "sold"].filter((s) => statuses.has(s));
  if (publicList.json?.ok && forbidden.length === 0) {
    pass("Public list only includes listable statuses", `count=${vehicles.length}`);
  } else {
    fail("Public list only includes listable statuses", `forbidden=${forbidden.join(",")}`);
  }

  const hasVin = vehicles.some((v: Record<string, unknown>) => "vin" in v);
  const hasSection = vehicles.some((v: Record<string, unknown>) => "section" in v);
  const hasRadicalModels = vehicles.some(
    (v: Record<string, unknown>) =>
      v.inventoryGroup === "radical_models" || v.section === "radical_models",
  );
  if (!hasVin) pass("Public list omits VIN");
  else fail("Public list omits VIN");
  if (!hasSection) pass("Public list omits stored section");
  else fail("Public list omits stored section");
  if (!hasRadicalModels) pass("Public list has no radical_models");
  else fail("Public list has no radical_models");

  for (const fixture of statusFixtures) {
    const row = vehicles.find((v: { slug: string }) => v.slug === fixture.slug);
    if (fixture.expectPublic) {
      if (row && row.inventoryGroup === fixture.expectGroup) {
        pass(`Public includes ${fixture.slug}`, `group=${row.inventoryGroup}`);
      } else {
        fail(`Public includes ${fixture.slug}`, JSON.stringify(row));
      }
    } else if (!row) {
      pass(`Public excludes ${fixture.slug}`);
    } else {
      fail(`Public excludes ${fixture.slug}`, JSON.stringify(row));
    }
  }

  const publicVehicle = vehicles.find((v: { slug: string }) =>
    String(v.slug).startsWith(QA_PREFIX),
  );
  if (publicVehicle?.slug) {
    const detail = await http(
      `/api/public/inventory/${PRIMAL_CLIENT_SLUG}/${publicVehicle.slug}`,
    );
    if (detail.json?.ok && detail.json.vehicle?.slug === publicVehicle.slug && !("vin" in (detail.json.vehicle ?? {}))) {
      pass("Public detail endpoint", publicVehicle.slug);
    } else {
      fail("Public detail endpoint", JSON.stringify(detail.json));
    }

    const img = publicVehicle.primaryImage?.url as string | undefined;
    if (img && /^https?:\/\//i.test(img)) {
      const imgRes = await fetch(img);
      if (imgRes.ok || imgRes.status === 304) pass("Public image URL resolves", `${imgRes.status} ${img}`);
      else fail("Public image URL resolves", `${imgRes.status} ${img}`);
    } else if (img) {
      fail("Public image URL is absolute", img);
    } else {
      fail("Public image URL present on public vehicle");
    }
  } else {
    fail("Public detail endpoint", "no public QA vehicle");
  }

  const badClient = await http("/api/public/inventory/no-such-client-34b");
  if (badClient.json?.ok && Array.isArray(badClient.json.vehicles) && badClient.json.vehicles.length === 0) {
    pass("Invalid client slug returns empty public list");
  } else if (badClient.status === 404) {
    pass("Invalid client slug returns 404");
  } else {
    fail("Invalid client slug handling", JSON.stringify(badClient.json));
  }

  const badVehicle = await http(
    `/api/public/inventory/${PRIMAL_CLIENT_SLUG}/no-such-vehicle-34b`,
  );
  if (badVehicle.status === 404 || badVehicle.json?.ok === false) {
    pass("Invalid vehicle slug returns not-found");
  } else {
    fail("Invalid vehicle slug returns not-found", JSON.stringify(badVehicle.json));
  }

  // Ops domain scoping
  const otherClients = await payload.find({
    collection: "clients",
    where: { slug: { not_equals: PRIMAL_CLIENT_SLUG } },
    limit: 1,
    overrideAccess: true,
  });
  if (otherClients.docs.length) {
    const otherId = (otherClients.docs[0] as { id: number }).id;
    const otherList = await listInventoryForClient(payload, otherId);
    const leak = otherList.filter((v) => v.slug.includes(QA_PREFIX));
    if (leak.length === 0) pass("Ops/domain client scoping — no QA leak to other client");
    else fail("Ops/domain client scoping — no QA leak to other client", `leak=${leak.length}`);

    // Temporarily verify a non-entitled portal user cannot access inventory
    const otherEmail = "inventory.qa.34b.other@kxd.local";
    const otherUserExisting = await payload.find({
      collection: "portal-users" as never,
      where: { email: { equals: otherEmail } } as never,
      limit: 1,
      overrideAccess: true,
    });
    const welcomeCompletedAt = new Date().toISOString();
    if (otherUserExisting.docs.length) {
      await payload.update({
        collection: "portal-users" as never,
        id: (otherUserExisting.docs[0] as { id: number }).id,
        data: {
          password: QA_PASSWORD,
          client: otherId,
          active: true,
          welcomeCompletedAt,
        } as never,
        overrideAccess: true,
      });
    } else {
      await payload.create({
        collection: "portal-users" as never,
        data: {
          email: otherEmail,
          displayName: "Inventory QA Other",
          client: otherId,
          password: QA_PASSWORD,
          active: true,
          welcomeCompletedAt,
        } as never,
        overrideAccess: true,
      });
    }
    const otherLogin = await fetch(`${BASE}/api/portal/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: otherEmail, password: QA_PASSWORD }),
    });
    const otherCookies = (otherLogin.headers.getSetCookie?.() ?? []).map(
      (c) => c.split(";")[0],
    );
    if (!otherCookies.length) {
      const raw = otherLogin.headers.get("set-cookie");
      if (raw) otherCookies.push(raw.split(";")[0]);
    }
    const otherJar = otherCookies.join("; ");
    const denied = await fetch(`${BASE}/api/portal/inventory`, {
      headers: { cookie: otherJar },
    });
    const deniedJson = await denied.json().catch(() => ({}));
    if (denied.status === 403) pass("Non-entitled client inventory API denied");
    else fail("Non-entitled client inventory API denied", `${denied.status} ${JSON.stringify(deniedJson)}`);

    const deniedPage = await fetch(`${BASE}/portal/inventory`, {
      headers: { cookie: otherJar },
      redirect: "manual",
    });
    const deniedText = await deniedPage.text();
    const exposedInventoryUi = /Add vehicle|kxd-ces-inventory/i.test(deniedText);
    const redirectsAway =
      /__next-page-redirect[^>]+url=\/portal/i.test(deniedText) ||
      /NEXT_REDIRECT;replace;\/portal/i.test(deniedText) ||
      ((deniedPage.status === 307 || deniedPage.status === 302) &&
        (deniedPage.headers.get("location") || "").endsWith("/portal"));
    if (!exposedInventoryUi && redirectsAway) {
      pass("Non-entitled portal inventory redirects away from module");
    } else {
      fail(
        "Non-entitled portal inventory redirects away from module",
        `status=${deniedPage.status} addVehicle=${exposedInventoryUi} redirect=${redirectsAway}`,
      );
    }
  } else {
    fail("Found another client for entitlement negative test");
  }

  // Admin collection reachable marker (unauth expects redirect/401)
  const adminCollection = await http("/admin/collections/client-inventory-vehicles", {
    redirect: "manual",
  });
  if (adminCollection.status === 200 || (adminCollection.status >= 300 && adminCollection.status < 400)) {
    pass("Admin inventory collection route exists", `status=${adminCollection.status}`);
  } else {
    fail("Admin inventory collection route exists", `status=${adminCollection.status}`);
  }

  const opsTab = await http(`/admin/operations/client-command/${primalId}?tab=inventory`, {
    redirect: "manual",
  });
  if (opsTab.status === 200 || (opsTab.status >= 300 && opsTab.status < 400)) {
    pass("Client Command inventory tab route exists", `status=${opsTab.status}`);
  } else {
    fail("Client Command inventory tab route exists", `status=${opsTab.status}`);
  }

  // Domain public mapper re-check via server helper
  const domainPublic = await listPublicInventory(payload, PRIMAL_CLIENT_SLUG);
  if (domainPublic.every((v) => !("vin" in v) && v.inventoryGroup)) {
    pass("Domain public mapper output clean");
  } else {
    fail("Domain public mapper output clean");
  }

  // Cleanup QA vehicles
  const removed = await cleanupQaVehicles(payload, primalId);
  pass("Cleanup QA vehicles", `removed=${removed}`);

  const remaining = await payload.find({
    collection: INVENTORY_COLLECTION as never,
    where: { slug: { contains: QA_PREFIX } } as never,
    limit: 10,
    overrideAccess: true,
  });
  if (remaining.docs.length === 0) pass("No QA inventory slugs remain");
  else fail("No QA inventory slugs remain", `left=${remaining.docs.length}`);

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nQA summary: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) {
    console.log("Failures:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail ?? ""}`);
    process.exit(1);
  }
  console.log("\nPhase 34B activation QA passed.\n");
  console.log(`Primal Client Command: ${BASE}/admin/operations/client-command/${primalId}?tab=inventory`);
  console.log(`QA portal user retained for manual review: ${QA_EMAIL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
