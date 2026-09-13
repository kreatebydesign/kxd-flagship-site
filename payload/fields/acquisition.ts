import type { Field } from "payload";
import { validatePersistedAcquisition } from "@/lib/analytics/acquisition";

/**
 * Bounded, read-only acquisition evidence stored on first-party intake records.
 * The public route constructs this value from an explicit allowlist.
 */
export function acquisitionField(): Field {
  return {
    name: "acquisition",
    type: "json",
    label: "Measured Acquisition",
    validate: validatePersistedAcquisition,
    admin: {
      readOnly: true,
      description:
        "First-touch and submission evidence captured by KXD. Separate from self-reported referral and operational source.",
    },
  };
}
