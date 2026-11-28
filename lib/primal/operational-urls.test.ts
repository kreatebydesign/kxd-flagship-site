import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  primalAdvancedSchoolApplicationUrl,
  primalAdvancedSchoolOperationsUrl,
  primalStaffLoginNextPath,
} from "./operational-urls";

describe("primal operational urls", () => {
  it("builds path-only login next links without secrets", () => {
    const url = primalStaffLoginNextPath("/client/school-applications");
    assert.match(url, /^https:\/\/www\.primalmotorsports\.com\/login\?next=/);
    assert.doesNotMatch(url, /token|session|password/i);
  });

  it("deep-links school application ids", () => {
    const url = primalAdvancedSchoolApplicationUrl("advapp_demo_qa01");
    assert.ok(url.includes("advapp_demo_qa01"));
  });

  it("falls back to list for invalid application ids", () => {
    assert.equal(
      primalAdvancedSchoolApplicationUrl("../evil"),
      primalAdvancedSchoolOperationsUrl(),
    );
  });
});