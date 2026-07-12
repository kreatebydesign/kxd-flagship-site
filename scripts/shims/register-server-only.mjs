/**
 * Resolve `server-only` to an empty module for CLI verification scripts.
 * Usage: tsx --import ./scripts/shims/register-server-only.mjs …
 */
import { register } from "node:module";

register("./server-only-hooks.mjs", import.meta.url);
