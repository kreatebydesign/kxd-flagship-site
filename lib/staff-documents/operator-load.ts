import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  listStaffDocumentTemplatesForOperator,
  listStaffDocumentsForOperator,
} from "./data.ts";

export async function loadStaffDocumentsOperatorWorkspace() {
  const payload = await getPayload({ config });
  const usersR = await payload.find({
    collection: "users",
    where: {
      staffRole: { not_equals: "none" },
    },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });

  const staffUsers = usersR.docs.map((doc) => {
    const row = doc as { id: number; displayName?: string; email?: string };
    return {
      id: Number(row.id),
      label: String(row.displayName ?? row.email ?? `User ${row.id}`),
    };
  });

  const [templates, assignments] = await Promise.all([
    listStaffDocumentTemplatesForOperator(),
    listStaffDocumentsForOperator(),
  ]);

  return { templates, assignments, staffUsers };
}
