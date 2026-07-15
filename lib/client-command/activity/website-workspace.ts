import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { publishClientActivity } from "./publish";
import type { WebsiteWorkspaceClientStatus } from "@/lib/ces/vocabulary/website-workspace";
import {
  workspaceEventTypeForStatus,
  workspaceStatusLabel,
  WEBSITE_WORKSPACE_ACTIVITY_DETAILS,
} from "@/lib/ces/vocabulary/website-workspace";
import { WEBSITE_WORKSPACE_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-workspace/constants";

export { WEBSITE_WORKSPACE_EXPERIENCE_MODULE };

export interface PublishWebsiteWorkspaceActivityInput {
  clientId: number;
  requestId: number;
  clientStatus: WebsiteWorkspaceClientStatus;
  summary?: string;
  author?: string;
  timestamp?: string;
}

/**
 * Client-visible Activity Engine bridge for Website Workspace update requests.
 */
export async function publishWebsiteWorkspaceActivity(
  input: PublishWebsiteWorkspaceActivityInput,
  payloadInstance?: Payload,
): Promise<void> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const eventType = workspaceEventTypeForStatus(input.clientStatus);
  const label = workspaceStatusLabel(input.clientStatus);

  await publishClientActivity(
    {
      clientId: input.clientId,
      sourceModule: "Portal",
      sourceType: "website-workspace",
      sourceId: `${input.requestId}:${eventType}`,
      eventType,
      title: label,
      summary:
        input.summary ??
        WEBSITE_WORKSPACE_ACTIVITY_DETAILS[input.clientStatus] ??
        undefined,
      requestId: input.requestId,
      author: input.author,
      timestamp: input.timestamp ?? new Date().toISOString(),
      status:
        input.clientStatus === "completed" || input.clientStatus === "declined"
          ? "completed"
          : "open",
      internalOnly: false,
      metadata: {
        experienceModule: WEBSITE_WORKSPACE_EXPERIENCE_MODULE,
        clientStatus: input.clientStatus,
      },
      relatedLinks: [
        {
          label: "Website Workspace",
          href: `/portal/website-workspace/requests/${input.requestId}`,
        },
      ],
    },
    payload,
  );
}
