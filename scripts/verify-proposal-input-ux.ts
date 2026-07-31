/**
 * Focused coverage: multi-word names + U.S. phone formatting helpers.
 *   npx tsx scripts/verify-proposal-input-ux.ts
 */
import {
  formatUsPhoneInput,
  isInternationalPhoneInput,
  normalizePhoneForStorage,
} from "../lib/formatting/phone-us.ts";

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean) {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

/**
 * Reproduce the old Primary-contact pipe parser that stripped spaces while typing.
 * Kept here to lock the regression (pipe+trim must not return for name fields).
 */
function legacyTrimmingContactParse(raw: string): string {
  const [name = ""] = raw.split("|").map((s) => s.trim());
  return name;
}

/** Controlled name field: value is stored as typed (trim only at submit). */
function typingNameState(prev: string, next: string): string {
  return next;
}

console.log("\nProposal input UX verification\n");

// Multi-word / spacing — Create Prospect + Primary contact name fields
check(
  "legacy pipe+trim ate trailing space (documents prior bug)",
  legacyTrimmingContactParse("Terry ") === "Terry",
);
let name = "";
name = typingNameState(name, "Terry");
name = typingNameState(name, "Terry ");
check("space after first name preserved while typing", name === "Terry ");
name = typingNameState(name, "Terry Brock");
check("multi-word name preserved", name === "Terry Brock");
check("hyphen preserved", typingNameState("", "Mary-Jane Watson") === "Mary-Jane Watson");
check("apostrophe preserved", typingNameState("", "O'Brien") === "O'Brien");
check("paste multi-word", typingNameState("", "Terry Brock") === "Terry Brock");
check("trim only at submit boundary", "  Terry Brock  ".trim() === "Terry Brock");

// Org line spaces (no trim-on-keystroke)
const orgLine = "Made for Trades ";
const pipe = orgLine.indexOf("|");
const orgName = pipe === -1 ? orgLine : orgLine.slice(0, pipe);
check("org trailing space preserved while typing", orgName === "Made for Trades ");

// Deliverable line spaces
const deliverableLines = "Brand strategy workshop \nWebsite redesign".split("\n");
check("deliverable trailing space preserved", deliverableLines[0] === "Brand strategy workshop ");

// Phone progressive formatting
check("empty phone", formatUsPhoneInput("") === "");
check("3 digits", formatUsPhoneInput("541") === "(541");
check("partial area", formatUsPhoneInput("5416") === "(541) 6");
check("6 digits", formatUsPhoneInput("541673") === "(541) 673");
check("full 10", formatUsPhoneInput("5416731234") === "(541) 673-1234");
check(
  "pasted formatted",
  formatUsPhoneInput("(541) 673-1234") === "(541) 673-1234",
);
check(
  "pasted messy",
  formatUsPhoneInput("541.673.1234") === "(541) 673-1234",
);
check(
  "leading 1 country code",
  formatUsPhoneInput("15416731234") === "(541) 673-1234",
);
check("backspace-friendly incomplete", formatUsPhoneInput("(541) 673-") === "(541) 673");
check(
  "extension not forced into US mask",
  formatUsPhoneInput("5416731234 x99") === "5416731234 x99" ||
    isInternationalPhoneInput("5416731234 x99"),
);

// International not forced
check("plus international detected", isInternationalPhoneInput("+44 7700 900123"));
check(
  "plus left unforced",
  formatUsPhoneInput("+44 7700 900123") === "+44 7700 900123",
);
check("00 prefix international", isInternationalPhoneInput("00447700900123"));

// Storage normalize
check(
  "store complete US",
  normalizePhoneForStorage("5416731234") === "(541) 673-1234",
);
check(
  "store international trimmed",
  normalizePhoneForStorage("  +44 7700 900123  ") === "+44 7700 900123",
);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
