import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";

/**
 * Founder QA portfolio (read-only). Operator Preview may switch between these
 * clients without Client Command round-trips. Does not grant portal membership.
 */
export const OPERATOR_PREVIEW_PORTFOLIO_CLIENT_IDS = [5, 9, 10, 14] as const;

export type OperatorPreviewPortfolioOption = {
  clientId: number;
  clientName: string;
};

export function isOperatorPreviewPortfolioClientId(clientId: number): boolean {
  return (OPERATOR_PREVIEW_PORTFOLIO_CLIENT_IDS as readonly number[]).includes(clientId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export async function loadOperatorPreviewPortfolioOptions(): Promise<
  OperatorPreviewPortfolioOption[]
> {
  const payload = await getPayload({ config });
  const options: OperatorPreviewPortfolioOption[] = [];

  for (const clientId of OPERATOR_PREVIEW_PORTFOLIO_CLIENT_IDS) {
    try {
      const client = (await payload.findByID({
        collection: "clients",
        id: clientId,
        depth: 0,
        overrideAccess: true,
      })) as AnyDoc;
      if (!client) continue;
      options.push({
        clientId,
        clientName: String(client.name ?? `Client #${clientId}`),
      });
    } catch {
      options.push({
        clientId,
        clientName: `Client #${clientId}`,
      });
    }
  }

  return options.sort((a, b) => a.clientName.localeCompare(b.clientName));
}
