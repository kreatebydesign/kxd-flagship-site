import "server-only";

import { cache } from "react";
import { getPayload } from "payload";
import config from "@payload-config";

/** One Payload instance per request — avoids repeat cold init in nested loaders. */
export const getSharedPayload = cache(async () => getPayload({ config }));