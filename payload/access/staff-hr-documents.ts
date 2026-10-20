import type { Access } from "payload";
import { denyAll, isStudioPayloadOperator } from "./index.ts";

/**
 * Staff HR documents (templates, assignments, private file registry).
 * Sensitive employment records — never mutated through Payload REST/Admin CRUD.
 * KXD OS staff surfaces mutate via Local API with overrideAccess after capability checks.
 */
export const staffHrDocumentReadAccess: Access = ({ req: { user } }) =>
  isStudioPayloadOperator(user);

export const staffHrDocumentDenyMutation: Access = denyAll;
