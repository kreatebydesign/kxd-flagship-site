/**
 * Universal Search — permanent architecture over Command Palette + lib/search.
 * New scopes register here; providers continue to live in lib/search.
 */

import { EXECUTIVE_SEARCH_SCOPES } from "./constants";
import type { ExecutiveSearchScope } from "./types";
import { openUniversalSearch } from "./quick-create";

export { openUniversalSearch };

export function listExecutiveSearchScopes(): ExecutiveSearchScope[] {
  return EXECUTIVE_SEARCH_SCOPES;
}

export function listActiveSearchScopes(): ExecutiveSearchScope[] {
  return EXECUTIVE_SEARCH_SCOPES.filter((scope) => scope.status === "active");
}

export function listReservedSearchScopes(): ExecutiveSearchScope[] {
  return EXECUTIVE_SEARCH_SCOPES.filter((scope) => scope.status === "reserved");
}
