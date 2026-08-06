/**
 * Argument parsing + snapshot validation for the Harlow/Sasha shift repair.
 * Pure module — no Payload imports — so static verification can load it safely.
 */

export type RepairExpectedSnapshot = {
  shiftId: number;
  juniorId: number;
  status: string;
  startedAt: string;
  endedAt: string | null;
  totalMinutes: number;
  hourlyRateCents: number;
  payAdjustmentCents: number;
};

export type RepairArgs = {
  apply: boolean;
  incidentWeek: string;
  harlow: RepairExpectedSnapshot;
  sasha: RepairExpectedSnapshot;
};

const WEEK_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function readArg(argv: string[], flag: string): string | undefined {
  const exact = argv.find((arg) => arg.startsWith(`${flag}=`));
  if (exact) return exact.slice(flag.length + 1);
  const index = argv.indexOf(flag);
  if (index === -1) return undefined;
  return argv[index + 1];
}

export function parseBooleanFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag) || process.env.APPLY === "1";
}

export function assertMondayIncidentWeek(weekKey: string): string {
  if (!WEEK_KEY_RE.test(weekKey)) {
    throw new Error("--incident-week must be YYYY-MM-DD.");
  }
  const [year, month, day] = weekKey.split("-").map(Number);
  const local = new Date(year, month - 1, day);
  if (
    local.getFullYear() !== year ||
    local.getMonth() !== month - 1 ||
    local.getDate() !== day
  ) {
    throw new Error("--incident-week must be a real calendar date.");
  }
  if (local.getDay() !== 1) {
    throw new Error("--incident-week must be a Monday (week key).");
  }
  return weekKey;
}

function requireFiniteNumber(value: unknown, label: string): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return num;
}

export function parseExpectedSnapshot(
  raw: string | undefined,
  label: string,
): RepairExpectedSnapshot {
  if (!raw || !raw.trim()) {
    throw new Error(`--${label}-snapshot JSON is required.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`--${label}-snapshot must be valid JSON.`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`--${label}-snapshot must be a JSON object.`);
  }

  const obj = parsed as Record<string, unknown>;
  const required = [
    "shiftId",
    "juniorId",
    "status",
    "startedAt",
    "totalMinutes",
    "hourlyRateCents",
    "payAdjustmentCents",
  ] as const;

  for (const key of required) {
    if (!(key in obj)) {
      throw new Error(`--${label}-snapshot missing required field "${key}".`);
    }
  }

  if (!("endedAt" in obj)) {
    throw new Error(`--${label}-snapshot missing required field "endedAt" (use null when open).`);
  }

  const status = String(obj.status ?? "").trim();
  if (!status) {
    throw new Error(`--${label}-snapshot.status must be a non-empty string.`);
  }

  const startedAt = String(obj.startedAt ?? "").trim();
  if (!startedAt || Number.isNaN(Date.parse(startedAt))) {
    throw new Error(`--${label}-snapshot.startedAt must be a valid ISO timestamp.`);
  }

  let endedAt: string | null = null;
  if (obj.endedAt != null) {
    const ended = String(obj.endedAt).trim();
    if (!ended || Number.isNaN(Date.parse(ended))) {
      throw new Error(`--${label}-snapshot.endedAt must be null or a valid ISO timestamp.`);
    }
    endedAt = ended;
  }

  return {
    shiftId: requireFiniteNumber(obj.shiftId, `${label}.shiftId`),
    juniorId: requireFiniteNumber(obj.juniorId, `${label}.juniorId`),
    status,
    startedAt,
    endedAt,
    totalMinutes: requireFiniteNumber(obj.totalMinutes, `${label}.totalMinutes`),
    hourlyRateCents: requireFiniteNumber(obj.hourlyRateCents, `${label}.hourlyRateCents`),
    payAdjustmentCents: requireFiniteNumber(
      obj.payAdjustmentCents,
      `${label}.payAdjustmentCents`,
    ),
  };
}

export function parseRepairArgs(argv: string[] = process.argv.slice(2)): RepairArgs {
  const incidentWeekRaw = readArg(argv, "--incident-week");
  if (!incidentWeekRaw) {
    throw new Error("--incident-week YYYY-MM-DD is required (do not derive from today).");
  }

  const incidentWeek = assertMondayIncidentWeek(incidentWeekRaw.trim());
  const harlow = parseExpectedSnapshot(readArg(argv, "--harlow-snapshot"), "harlow");
  const sasha = parseExpectedSnapshot(readArg(argv, "--sasha-snapshot"), "sasha");

  if (harlow.shiftId === sasha.shiftId) {
    throw new Error("Harlow and Sasha snapshots must target different shift IDs.");
  }

  return {
    apply: parseBooleanFlag(argv, "--apply"),
    incidentWeek,
    harlow,
    sasha,
  };
}

export function timestampsEqual(expected: string | null, actual: unknown): boolean {
  if (expected == null) return actual == null || actual === "";
  if (actual == null || actual === "") return false;
  const left = Date.parse(String(expected));
  const right = Date.parse(String(actual));
  if (Number.isNaN(left) || Number.isNaN(right)) {
    return String(expected) === String(actual);
  }
  return left === right;
}

export function numbersEqual(expected: number, actual: unknown): boolean {
  return Number(actual) === expected;
}
