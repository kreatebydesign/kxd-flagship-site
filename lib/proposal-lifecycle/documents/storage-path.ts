import { resolve, normalize, sep } from "path";

/** Resolve storage key under root; reject traversal. */
export function resolveStoragePath(storageRoot: string, storageKey: string): string {
  const root = resolve(storageRoot) + sep;
  const abs = resolve(storageRoot, normalize(storageKey));
  if (!abs.startsWith(root)) {
    throw new Error("Invalid storage key.");
  }
  return abs;
}
