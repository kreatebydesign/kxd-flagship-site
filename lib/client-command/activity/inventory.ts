import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { publishActivity } from "@/lib/activity-engine/publish";

export type InventoryClientActivityKind =
  | "published"
  | "hidden"
  | "updated";

export interface PublishInventoryActivityInput {
  clientId: number;
  vehicleId: number;
  vehicleTitle: string;
  kind: InventoryClientActivityKind;
  author?: string;
}

/**
 * Client-visible inventory lifecycle events for the CES Notifications Center.
 *
 * published/hidden use dedupe:false so a later re-publish after hide can notify again.
 * Same-request accidental doubles are avoided by calling only on status transitions.
 */
export async function publishInventoryActivity(
  input: PublishInventoryActivityInput,
  payloadInstance?: Payload,
): Promise<void> {
  const payload = payloadInstance ?? (await getPayload({ config }));

  const titles: Record<InventoryClientActivityKind, string> = {
    published: "Vehicle Published",
    hidden: "Vehicle Hidden",
    updated: "Inventory Update Completed",
  };

  const summaries: Record<InventoryClientActivityKind, string> = {
    published: `${input.vehicleTitle} is now live on your showroom.`,
    hidden: `${input.vehicleTitle} is no longer visible on your showroom.`,
    updated: `${input.vehicleTitle} has been updated.`,
  };

  const lifecycle = input.kind === "published" || input.kind === "hidden";

  await publishActivity(
    {
      clientId: input.clientId,
      sourceModule: "Portal",
      sourceType: "inventory",
      sourceId: lifecycle
        ? `${input.vehicleId}:${input.kind}:${Date.now()}`
        : `${input.vehicleId}:${input.kind}`,
      eventType: `inventory.${input.kind}`,
      title: titles[input.kind],
      summary: summaries[input.kind],
      author: input.author,
      occurredAt: new Date().toISOString(),
      status: input.kind === "hidden" ? "completed" : "open",
      category: "website",
      internalOnly: false,
      dedupe: !lifecycle,
      metadata: {
        experienceModule: "inventory",
        vehicleId: input.vehicleId,
      },
      relatedLinks: [
        {
          label: "Inventory",
          href: `/portal/inventory/${input.vehicleId}`,
        },
      ],
    },
    payload,
  );
}
