/**
 * Sales layout login return path — nested proposal routes preserve deep links.
 *   npm run verify:sales-layout-return-path
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { trustedLayoutReturnPath } from "../lib/admin/trusted-layout-return-path.ts";

const root = path.resolve(import.meta.dirname, "..");
const fallback = "/admin/sales";

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

console.log("\nSales layout return path — verify:sales-layout-return-path\n");

assert.equal(
  trustedLayoutReturnPath(
    "/admin/sales/proposals/12/preview",
    fallback,
    fallback,
  ),
  "/admin/sales/proposals/12/preview",
);
assert.equal(
  trustedLayoutReturnPath("/admin/sales/proposals/11", fallback, fallback),
  "/admin/sales/proposals/11",
);
assert.equal(
  trustedLayoutReturnPath("/admin/sales?focus=24", fallback, fallback),
  "/admin/sales?focus=24",
);
assert.equal(trustedLayoutReturnPath("/admin/sales", fallback, fallback), "/admin/sales");
assert.equal(trustedLayoutReturnPath("", fallback, fallback), fallback);
assert.equal(trustedLayoutReturnPath(undefined, fallback, fallback), fallback);

assert.equal(
  trustedLayoutReturnPath("//evil.example/phish", fallback, fallback),
  fallback,
);
assert.equal(
  trustedLayoutReturnPath("https://evil.example/phish", fallback, fallback),
  fallback,
);
assert.equal(
  trustedLayoutReturnPath("/admin/operations/today", fallback, fallback),
  fallback,
);
assert.equal(
  trustedLayoutReturnPath("/admin/collections/proposals/12", fallback, fallback),
  fallback,
);

const salesLayout = read("app/admin/sales/layout.tsx");
assert.match(salesLayout, /x-kxd-pathname/);
assert.match(salesLayout, /trustedLayoutReturnPath/);
assert.match(salesLayout, /requireStaffAwarePage\(returnPath\)/);
assert.doesNotMatch(salesLayout, /requireStaffAwarePage\("\/admin\/sales"\)/);

console.log("verify:sales-layout-return-path: OK\n");
