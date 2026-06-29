import type { ClientWorkspaceBundle } from "../workspace-types";
import { buildClientMemory, buildClientMemoryAiPayload } from "./summary";
import type { ClientMemorySnapshot } from "./types";

export function loadClientMemoryFromBundle(
  bundle: Omit<ClientWorkspaceBundle, "memory" | "actions" | "proposals" | "proposalIntelligence">,
  options?: import("./summary").ClientMemoryBuildOptions,
): ClientMemorySnapshot {
  return buildClientMemory(bundle, options);
}

export { buildClientMemoryAiPayload };
