export type PlatformOwner = "shared-core" | "agency-edition" | "platform-owner";

export type PlatformMaturity = "prototype" | "alpha" | "beta" | "production";

export type PlatformSubsystemStatus =
  | "stable"
  | "active"
  | "building"
  | "consolidation"
  | "planned";

export type PlatformPhaseStatus = "completed" | "in-progress" | "planned";

export interface PlatformSubsystemDefinition {
  id: string;
  name: string;
  category: string;
  owner: PlatformOwner;
  maturity: PlatformMaturity;
  completionPercent: number;
  status: PlatformSubsystemStatus;
  dependencies: string[];
  lastCompletedPhase: string;
  currentPhase: string;
  href?: string;
  description?: string;
}

export interface PlatformPhaseDefinition {
  id: string;
  number: string;
  title: string;
  status: PlatformPhaseStatus;
  description: string;
  completedAt?: string;
}

export interface PlatformPrinciple {
  id: string;
  text: string;
}

export interface PlatformMeta {
  currentPhase: string;
  currentPhaseTitle: string;
  version: string;
  editionLabel: string;
  buildDate: string;
}

export interface PlatformOverview {
  overallCompletionPercent: number;
  sharedCorePercent: number;
  agencyEditionPercent: number;
  platformLayerPercent: number;
  meta: PlatformMeta;
}

export interface PlatformEngineeringHealth {
  payloadCollections: number;
  adminRoutes: number;
  portalRoutes: number;
  salesRoutes: number;
  payloadHooks: number;
  automationModules: number;
  automationModulesConnected: number;
  portalModules: number;
  portalModulesProduction: number;
  sharedCoreSubsystems: number;
  agencySubsystems: number;
  platformSubsystems: number;
  kxdEditionModules: number;
  libPlatformModules: number;
}

export interface PlatformRoadmap {
  recentlyCompleted: PlatformPhaseDefinition[];
  current: PlatformPhaseDefinition | null;
  planned: PlatformPhaseDefinition[];
}

export interface PlatformDashboardData {
  overview: PlatformOverview;
  subsystems: PlatformSubsystemDefinition[];
  architecture: {
    sharedCore: PlatformSubsystemDefinition[];
    agencyEdition: PlatformSubsystemDefinition[];
    platformOwner: PlatformSubsystemDefinition[];
  };
  phases: PlatformPhaseDefinition[];
  roadmap: PlatformRoadmap;
  health: PlatformEngineeringHealth;
  principles: PlatformPrinciple[];
}
