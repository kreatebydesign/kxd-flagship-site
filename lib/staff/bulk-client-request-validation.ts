/** Generic denial — do not reveal missing vs unauthorized ids. */
export const STAFF_BULK_CLIENT_REQUEST_DENIED =
  "Staff permission denied for one or more review requests.";

/**
 * Pure validation for assignment-scoped staff.
 * `allowedClientIds` empty ⇒ no client may be accessed.
 */
export function validateBulkClientRequestAccess(input: {
  usesAssignmentScope: boolean;
  allowedClientIds: number[];
  requestedIds: number[];
  resolvedClients: Map<number, number | null>;
}): boolean {
  if (!input.usesAssignmentScope) return true;
  const unique = [
    ...new Set(
      input.requestedIds.filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  if (unique.length === 0) return true;
  if (unique.length !== input.resolvedClients.size) return false;
  for (const id of unique) {
    if (!input.resolvedClients.has(id)) return false;
    const clientId = input.resolvedClients.get(id);
    if (clientId == null || !input.allowedClientIds.includes(clientId)) {
      return false;
    }
  }
  return true;
}
