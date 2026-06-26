import type { Payload } from "payload";
import { getRegisteredRules } from "./rules";
import type { AutomationEventRecord, AutomationRuleContext } from "./types";

export async function executeMatchingRules(
  event: AutomationEventRecord,
  payload?: Payload,
): Promise<void> {
  const ctx: AutomationRuleContext = { payload };

  for (const rule of getRegisteredRules()) {
    if (!rule.when(event)) continue;

    try {
      await rule.then(event, ctx);
    } catch (err) {
      console.error(`[KXD Automation] Rule ${rule.id} failed:`, err);
      throw err;
    }
  }
}
