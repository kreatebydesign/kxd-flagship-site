/**
 * Save & Next form reset regression.
 * Run: npx tsx --test lib/calendar/editor-form.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";
import { formStateForNextEvent, type CalendarEditorFormState } from "./editor-form.ts";

function filledForm(overrides: Partial<CalendarEditorFormState> = {}): CalendarEditorFormState {
  return {
    titleOverride: "",
    sourceTitle: "Spring HPDE",
    startsOn: "2026-04-12",
    endsOn: "2026-04-13",
    eventType: "track_day",
    status: "scheduled",
    listedOnWebsite: true,
    featured: true,
    venueName: "Road Atlanta",
    venueCity: "Braselton",
    venueState: "GA",
    venueAddress: "1240 Highway 53",
    summary: "Summary",
    description: "Public copy",
    practiceNotes: "Private prep",
    registrationGuidance: "Call the office",
    timezone: "America/Chicago",
    ...overrides,
  };
}

const editorSource = readFileSync(
  join(process.cwd(), "components/ces/modules/calendar/CalendarEditor.tsx"),
  "utf8",
);

describe("formStateForNextEvent", () => {
  it("clears event-specific fields", () => {
    const next = formStateForNextEvent(filledForm());
    assert.equal(next.sourceTitle, "");
    assert.equal(next.startsOn, "");
    assert.equal(next.endsOn, "");
    assert.equal(next.venueName, "");
    assert.equal(next.description, "");
    assert.equal(next.practiceNotes, "");
    assert.equal(next.registrationGuidance, "");
    assert.equal(next.summary, "");
  });

  it("preserves event type and timezone", () => {
    const next = formStateForNextEvent(filledForm());
    assert.equal(next.eventType, "track_day");
    assert.equal(next.timezone, "America/Chicago");
  });

  it("resets publishing and workflow to draft/unpublished", () => {
    const next = formStateForNextEvent(filledForm());
    assert.equal(next.status, "draft");
    assert.equal(next.listedOnWebsite, false);
    assert.equal(next.featured, false);
  });
});

describe("CalendarEditor Save & Next wiring", () => {
  it("shows Save & Next only in create mode", () => {
    assert.match(editorSource, /mode === "create" \? \([\s\S]*Save & Next/);
    assert.doesNotMatch(editorSource, /mode === "edit"[\s\S]*Save & Next/);
  });

  it("blocks duplicate submissions while in flight", () => {
    assert.match(editorSource, /saveInFlightRef\.current/);
    assert.match(editorSource, /if \(saveInFlightRef\.current \|\| saving\) return/);
    assert.match(editorSource, /disabled=\{saving \|\| pending\}/);
  });

  it("does not reset form after a failed save", () => {
    const failBlock = editorSource.match(
      /if \(!response\.ok \|\| !data\.ok\) \{[\s\S]*?return;[\s\S]*?\}/,
    );
    assert.ok(failBlock, "failed save branch exists");
    assert.doesNotMatch(failBlock![0], /formStateForNextEvent/);
    assert.doesNotMatch(failBlock![0], /setForm/);
  });

  it("keeps standard Save navigation for save intent", () => {
    assert.match(editorSource, /persist\("save"\)/);
    assert.match(editorSource, /router\.push\(`\/portal\/calendar\/\$\{data\.event\.eventKey\}`\)/);
    assert.match(
      editorSource,
      /if \(intent === "saveNext" && mode === "create"\)[\s\S]*return;[\s\S]*router\.push/,
    );
  });

  it("focuses event name after Save & Next success", () => {
    assert.match(editorSource, /eventNameRef/);
    assert.match(editorSource, /queueMicrotask\(\(\) => eventNameRef\.current\?\.focus\(\)\)/);
  });
});
