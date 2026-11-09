import "server-only";

import type { OperatorPreviewDraftComposition } from "./types";
import { buildOperatorPortalPreviewSession } from "./token";
import { setOperatorPortalPreviewCookie } from "./cookie";
import { destroyPortalSession } from "../session";

export async function remintOperatorPortalPreview(input: {
  adminUserId: number;
  adminEmail: string;
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  draftComposition?: OperatorPreviewDraftComposition;
}): Promise<void> {
  const session = buildOperatorPortalPreviewSession({
    adminUserId: input.adminUserId,
    adminEmail: input.adminEmail,
    clientId: input.clientId,
    clientName: input.clientName,
    clientSlug: input.clientSlug,
    draftComposition: input.draftComposition,
  });
  await destroyPortalSession();
  await setOperatorPortalPreviewCookie(session);
}
