/**
 * Client Locations — Primal Phase 1 Lead Command foundation (Build 1).
 *
 * Structural location registry for multi-location managed clients (e.g. Primal
 * Motorsports schools/tracks). Operator-only. Not a public collection, not a
 * CRM, not a booking system. Build 1 only links inquiries to a location —
 * no calendar, no registration, no public Florida/Tennessee rollout.
 */

import type { CollectionConfig } from "payload";
import { denyAll, isStudioPayloadOperator } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ClientLocations: CollectionConfig = {
  slug: "client-locations",
  labels: {
    singular: "Client Location",
    plural: "Client Locations",
  },
  defaultSort: "name",
  lockDocuments: false,
  timestamps: true,
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "client", "status", "region", "isPublic"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Structural locations for a managed client (e.g. school/track sites). Foundation only — no calendar, registration, or public rollout in Build 1.",
  },
  access: {
    read: ({ req: { user } }) => isStudioPayloadOperator(user),
    create: ({ req: { user } }) => isStudioPayloadOperator(user),
    update: ({ req: { user } }) => isStudioPayloadOperator(user),
    delete: denyAll,
  },
  fields: [
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      index: true,
      label: "Client",
      admin: { position: "sidebar" },
    },
    {
      name: "name",
      type: "text",
      required: true,
      label: "Location name",
    },
    {
      name: "slug",
      type: "text",
      required: true,
      label: "Slug",
      admin: {
        description: "Stable identifier for this location (not a public URL in Build 1).",
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      index: true,
      options: [
        { label: "Active", value: "active" },
        { label: "Planned", value: "planned" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "isPublic",
      type: "checkbox",
      defaultValue: false,
      label: "Public",
      admin: {
        position: "sidebar",
        description: "Reserved for future public rollout. Not used by Build 1.",
      },
    },
    {
      name: "region",
      type: "text",
      label: "Region",
      admin: {
        description: "Optional operator-facing region label (e.g. state/market).",
      },
    },
  ],
};
