import "server-only";

import { getWebsiteAuditorLiveContext } from "@/lib/live-integrations/engine";

export { getWebsiteAuditorLiveContext };

export function hasWebsiteAuditorLiveMetrics(): boolean {
  return getWebsiteAuditorLiveContext().hasLiveMetrics;
}
