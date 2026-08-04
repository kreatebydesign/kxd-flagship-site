/**
 * Phase 6 Batch C3 — deterministic local Connect fixture staff identities.
 * Shared by bootstrap + smoke scripts. Not a production directory.
 */

export const CONNECT_LOCAL_FIXTURE_STAFF = [
  {
    email: "connect-a@kxd.local",
    displayName: "Connect Fixture A",
    key: "a",
  },
  {
    email: "connect-b@kxd.local",
    displayName: "Connect Fixture B",
    key: "b",
  },
  {
    email: "connect-c@kxd.local",
    displayName: "Connect Fixture C",
    key: "c",
  },
] as const;
