/**
 * Node.js runtime checks for CVE-2026-111497 (Oct 2026 Brotli / node:zlib).
 * Pure helpers — safe for verify scripts and server routes.
 */

/** Patched minimum per affected major line (Node.js Oct 21, 2026 security releases). */
export const CVE_2026_111497_PATCHED_MINIMUM: Readonly<
  Record<number, readonly [number, number, number]>
> = {
  22: [22, 23, 4],
  24: [24, 22, 1],
  26: [26, 12, 1],
};

export type NodeRuntimeTriple = readonly [major: number, minor: number, patch: number];

/** Parse `process.version` or semver strings (leading `v` optional). */
export function parseNodeRuntimeVersion(version: string): NodeRuntimeTriple | null {
  const trimmed = version.trim().replace(/^v/i, "");
  const core = trimmed.split("-")[0]?.split("+")[0] ?? "";
  const parts = core.split(".");
  if (parts.length < 3) return null;

  const major = Number(parts[0]);
  const minor = Number(parts[1]);
  const patch = Number(parts[2]);

  if (
    !Number.isInteger(major) ||
    !Number.isInteger(minor) ||
    !Number.isInteger(patch) ||
    major < 0 ||
    minor < 0 ||
    patch < 0
  ) {
    return null;
  }

  return [major, minor, patch];
}

/** Semantic compare on major.minor.patch only. Returns null if either operand is invalid. */
export function compareNodeRuntimeVersions(left: string, right: string): number | null {
  const a = parseNodeRuntimeVersion(left);
  const b = parseNodeRuntimeVersion(right);
  if (!a || !b) return null;

  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

/**
 * True when the runtime is on a patched release for its major line, or on a
 * major line outside the CVE-2026-111497 affected set (22 / 24 / 26).
 */
export function nodeRuntimeMeetsCve2026111497Minimum(version: string): boolean {
  const parsed = parseNodeRuntimeVersion(version);
  if (!parsed) return false;

  const minimum = CVE_2026_111497_PATCHED_MINIMUM[parsed[0]];
  if (!minimum) return true;

  const cmp = compareNodeRuntimeVersions(
    `v${parsed.join(".")}`,
    `v${minimum.join(".")}`,
  );
  return cmp !== null && cmp >= 0;
}

export function resolveNodeRuntimeSecurityFields(): {
  nodeRuntimeVersion: string;
  nodeRuntimeMeetsCve2026111497Minimum: boolean;
} {
  const nodeRuntimeVersion = process.version;
  return {
    nodeRuntimeVersion,
    nodeRuntimeMeetsCve2026111497Minimum:
      nodeRuntimeMeetsCve2026111497Minimum(nodeRuntimeVersion),
  };
}
