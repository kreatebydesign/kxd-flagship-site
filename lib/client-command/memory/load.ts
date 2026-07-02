import type { ClientWorkspaceMemoryInput } from "../workspace-types";
import { buildClientMemory, buildClientMemoryAiPayload } from "./summary";
import type { ClientMemorySnapshot } from "./types";

export function loadClientMemoryFromBundle(
  bundle: ClientWorkspaceMemoryInput,
  options?: import("./summary").ClientMemoryBuildOptions,
): ClientMemorySnapshot {
  return buildClientMemory(bundle, options);
}

export { buildClientMemoryAiPayload };
