import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const BORDER_RADIUS_OPTIONS = [
  { label: "Soft", value: "soft" },
  { label: "Default", value: "default" },
  { label: "Sharp", value: "sharp" },
];

const MOTION_OPTIONS = [
  { label: "Calm", value: "calm" },
  { label: "Default", value: "default" },
  { label: "Reduced", value: "reduced" },
];

const SUPPORT_TONE_OPTIONS = [
  { label: "Warm & professional", value: "warm-professional" },
  { label: "Direct", value: "direct" },
  { label: "Formal", value: "formal" },
];

export const ClientExperienceProfiles: CollectionConfig = {
  slug: "client-experience-profiles",
  labels: {
    singular: "Client Experience Profile",
    plural: "Client Experience Profiles",
  },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "profileName",
    defaultColumns: ["profileName", "client", "status", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "CES — how each client experiences KXD OS. Identity, hospitality, and enabled client modules.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "profileName",
      type: "text",
      required: true,
      label: "Profile Name",
      admin: {
        description: "Internal label, e.g. Primal Motorsports Experience.",
      },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      unique: true,
      label: "Client",
      admin: {
        position: "sidebar",
        description: "One experience profile per client.",
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Active", value: "active" },
        { label: "Archived", value: "archived" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "brandKit",
      type: "relationship",
      relationTo: "brand-kits",
      label: "Brand Kit",
      admin: {
        description: "Primary visual and voice source — CES resolves from here when set.",
      },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Presentation",
          fields: [
            {
              name: "logoOverride",
              type: "upload",
              relationTo: "media",
              label: "Logo Override",
              admin: {
                description: "Optional. Falls back to onboarding logo when empty.",
              },
            },
            {
              type: "row",
              fields: [
                {
                  name: "primaryColor",
                  type: "text",
                  label: "Primary Color",
                  admin: { description: "Hex override, e.g. #0A0A0A" },
                },
                {
                  name: "secondaryColor",
                  type: "text",
                  label: "Secondary Color",
                },
                {
                  name: "accentColor",
                  type: "text",
                  label: "Accent Color",
                },
              ],
            },
            {
              name: "surfaceTint",
              type: "text",
              label: "Surface Tint",
              admin: {
                description: "Optional rgba tint for atmospheric surfaces, e.g. rgba(168, 52, 36, 0.032)",
              },
            },
            {
              type: "row",
              fields: [
                {
                  name: "borderRadiusPreset",
                  type: "select",
                  label: "Border Radius",
                  defaultValue: "default",
                  options: BORDER_RADIUS_OPTIONS,
                },
                {
                  name: "motionPreset",
                  type: "select",
                  label: "Motion",
                  defaultValue: "calm",
                  options: MOTION_OPTIONS,
                },
              ],
            },
          ],
        },
        {
          label: "Hospitality",
          admin: {
            description:
              "How the client feels — clarity, confidence, calm, and trust. Not decoration.",
          },
          fields: [
            {
              name: "welcomeEyebrow",
              type: "text",
              label: "Welcome Eyebrow",
              admin: {
                description: "Short orienting line, e.g. “Welcome back” or client program name.",
              },
            },
            {
              name: "reassuranceLine",
              type: "text",
              label: "Reassurance Line",
              admin: {
                description: "Quiet trust line shown in the shell — e.g. “Your team is on it.”",
              },
            },
            {
              name: "supportTone",
              type: "select",
              label: "Support Tone",
              defaultValue: "warm-professional",
              options: SUPPORT_TONE_OPTIONS,
            },
            {
              name: "portalSidebarLabel",
              type: "text",
              label: "Portal Sidebar Label",
              admin: {
                description: "Optional override for the client workspace name in navigation.",
              },
            },
          ],
        },
        {
          label: "Modules",
          fields: [
            {
              name: "enabledModules",
              type: "json",
              label: "Enabled CES Modules",
              admin: {
                description: 'String array, e.g. ["website-review"]',
              },
            },
            {
              name: "terminology",
              type: "json",
              label: "Terminology Overrides",
              admin: {
                description: "Optional key-value map for client-facing labels.",
              },
            },
          ],
        },
        {
          label: "Partner",
          fields: [
            {
              name: "showKxdPartnerMark",
              type: "checkbox",
              label: "Show KXD Partner Mark",
              defaultValue: true,
            },
            {
              name: "partnerFooterLine",
              type: "text",
              label: "Partner Footer Line",
              admin: {
                description: "Understated footer, e.g. “Powered by Kreate by Design”",
              },
            },
          ],
        },
      ],
    },
  ],
};
