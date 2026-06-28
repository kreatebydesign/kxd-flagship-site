import { DEFAULT_EDITION_PERMISSIONS } from "./permissions";
import { KXD_CORE_BRANDING } from "./branding";
import type { EditionDefinition, EditionId } from "./types";

const FUTURE_CAPS_OFF = {
  marketplace: false,
  paidEditions: false,
  whiteLabelLicensing: false,
  customerInstalledModules: false,
  pluginArchitecture: false,
};

export const KXD_CORE_EDITION: EditionDefinition = {
  id: "kxd-core",
  name: "KXD Core",
  description:
    "Default edition — full creative studio operations platform. Everything currently built in KXD OS belongs to KXD Core.",
  logo: null,
  color: "#0f0f0f",
  theme: "kxd-core",
  branding: KXD_CORE_BRANDING,
  permissions: DEFAULT_EDITION_PERMISSIONS,
  futureCapabilities: FUTURE_CAPS_OFF,
};

function stubEdition(
  partial: Pick<EditionDefinition, "id" | "name" | "description" | "color" | "theme"> &
    Partial<Pick<EditionDefinition, "enabledModules" | "disabledModules" | "customNavigation" | "features">>,
): EditionDefinition {
  return {
    id: partial.id,
    name: partial.name,
    description: partial.description,
    logo: null,
    color: partial.color,
    theme: partial.theme,
    enabledModules: partial.enabledModules,
    disabledModules: partial.disabledModules,
    customNavigation: partial.customNavigation,
    features: partial.features,
    branding: {
      ...KXD_CORE_BRANDING,
      companyName: partial.name,
      footerText: `${partial.name} · Edition stub`,
      primaryColor: partial.color,
      portal: {
        ...KXD_CORE_BRANDING.portal,
        sidebarLabel: partial.name,
        welcomeEyebrow: partial.name,
      },
      email: {
        fromName: partial.name,
        footerLine: `${partial.name} · Powered by KXD Core`,
      },
    },
    permissions: DEFAULT_EDITION_PERMISSIONS,
    futureCapabilities: FUTURE_CAPS_OFF,
  };
}

export const EDITION_REGISTRY: Record<EditionId, EditionDefinition> = {
  "kxd-core": KXD_CORE_EDITION,
  "contractor-os": stubEdition({
    id: "contractor-os",
    name: "Contractor OS",
    description: "Field operations, jobs, and client delivery for contractors — metadata stub only.",
    color: "#2d4a3e",
    theme: "contractor",
    disabledModules: ["creative", "playbooks", "growth"],
  }),
  "motorsports-os": stubEdition({
    id: "motorsports-os",
    name: "Motorsports OS",
    description: "Racing teams, sponsors, and event operations — metadata stub only.",
    color: "#1a1a1a",
    theme: "motorsports",
    disabledModules: ["creative", "onboarding"],
  }),
  "restaurant-os": stubEdition({
    id: "restaurant-os",
    name: "Restaurant OS",
    description: "Hospitality venues, menus, and local marketing — metadata stub only.",
    color: "#8b4513",
    theme: "restaurant",
    disabledModules: ["creative", "sales"],
  }),
  "hospitality-os": stubEdition({
    id: "hospitality-os",
    name: "Hospitality OS",
    description: "Hotels, resorts, and guest experience operations — metadata stub only.",
    color: "#4a5568",
    theme: "hospitality",
    disabledModules: ["creative"],
  }),
  "political-campaign-os": stubEdition({
    id: "political-campaign-os",
    name: "Political Campaign OS",
    description: "Campaign operations, fundraising, and field strategy — metadata stub only.",
    color: "#1e3a5f",
    theme: "political",
    disabledModules: ["creative", "playbooks"],
  }),
  "creative-studio-os": stubEdition({
    id: "creative-studio-os",
    name: "Creative Studio OS",
    description: "Agency and studio delivery with creative-first workflows — metadata stub only.",
    color: "#0f0f0f",
    theme: "creative-studio",
    enabledModules: [
      "creative",
      "work",
      "client-hq",
      "reporting",
      "brain",
      "search",
      "notifications",
      "operations",
      "portfolio",
      "timeline",
      "integrations",
    ],
  }),
  "manufacturing-os": stubEdition({
    id: "manufacturing-os",
    name: "Manufacturing OS",
    description: "Production, supply chain, and B2B client operations — metadata stub only.",
    color: "#374151",
    theme: "manufacturing",
    disabledModules: ["creative", "growth"],
  }),
};

export function getEditionById(id: EditionId): EditionDefinition {
  return EDITION_REGISTRY[id] ?? KXD_CORE_EDITION;
}

export function listRegisteredEditions(): EditionDefinition[] {
  return Object.values(EDITION_REGISTRY);
}
