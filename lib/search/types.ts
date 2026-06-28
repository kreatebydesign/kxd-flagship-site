/** Phase 7B — Universal Command Search types */

export type SearchGroupId =
  | "commands"
  | "clients"
  | "projects"
  | "sales"
  | "reports"
  | "infrastructure"
  | "creative"
  | "strategy"
  | "automation"
  | "brain"
  | "navigation"
  | "playbook"
  | "playbook-run"
  | "client-success";

export type SearchEntityType =
  | "command"
  | "client"
  | "project"
  | "deliverable"
  | "request"
  | "retainer"
  | "sales-lead"
  | "proposal"
  | "report"
  | "note"
  | "timeline"
  | "infrastructure"
  | "audit"
  | "campaign"
  | "brand-kit"
  | "creative-asset"
  | "meeting"
  | "portal-user"
  | "automation-event"
  | "brain-signal"
  | "brain-recommendation"
  | "nav"
  | "playbook"
  | "playbook-run"
  | "success-plan"
  | "success-check-in";

export interface CommandSearchResult {
  id: string;
  type: SearchEntityType;
  group: SearchGroupId;
  title: string;
  subtitle?: string;
  clientId?: number | null;
  clientName?: string | null;
  href: string;
  actionLabel?: string;
  updatedAt?: string | null;
  icon?: string;
  score?: number;
  pinned?: boolean;
}

export interface CommandSearchGroup {
  id: SearchGroupId;
  label: string;
  results: CommandSearchResult[];
}

export interface CommandDefinition {
  id: string;
  title: string;
  keywords: string[];
  href: string;
  group: SearchGroupId;
  icon: string;
  actionLabel?: string;
}

export interface CommandSearchResponse {
  success: boolean;
  query: string;
  groups: CommandSearchGroup[];
  commands: CommandSearchResult[];
  tookMs?: number;
}

export interface SearchRankingContext {
  query: string;
  pinnedIds?: Set<string>;
  frequentIds?: Map<string, number>;
  recentIds?: string[];
}

/** Future adapters — no providers implemented in Phase 7B */
export interface SemanticSearchAdapter {
  id: string;
  isConfigured(): boolean;
  search?(query: string, limit?: number): Promise<CommandSearchResult[]>;
}

export interface VoiceSearchAdapter {
  id: string;
  isConfigured(): boolean;
}

export interface NaturalLanguageSearchAdapter {
  id: string;
  isConfigured(): boolean;
}

export const SEMANTIC_ADAPTER_PLACEHOLDERS = [
  { id: "vector-pg", label: "Vector (Postgres)", status: "not-configured" as const },
  { id: "openai-embeddings", label: "OpenAI Embeddings", status: "not-configured" as const },
] as const;

export const GROUP_LABELS: Record<SearchGroupId, string> = {
  commands: "Commands",
  clients: "Clients",
  projects: "Projects",
  sales: "Sales",
  reports: "Reports",
  infrastructure: "Infrastructure",
  creative: "Creative",
  strategy: "Strategy",
  automation: "Automation",
  brain: "Brain",
  navigation: "Navigate",
  playbook: "Playbooks",
  "playbook-run": "Playbook runs",
  "client-success": "Client Success",
};

export function groupForType(type: SearchEntityType): SearchGroupId {
  switch (type) {
    case "command":
      return "commands";
    case "client":
      return "clients";
    case "project":
    case "deliverable":
    case "request":
      return "projects";
    case "retainer":
    case "sales-lead":
    case "proposal":
      return "sales";
    case "report":
      return "reports";
    case "infrastructure":
    case "audit":
      return "infrastructure";
    case "campaign":
    case "brand-kit":
    case "creative-asset":
      return "creative";
    case "note":
    case "timeline":
    case "meeting":
    case "playbook":
    case "playbook-run":
      return "strategy";
    case "success-plan":
    case "success-check-in":
      return "client-success";
    case "automation-event":
      return "automation";
    case "brain-signal":
    case "brain-recommendation":
      return "brain";
    case "portal-user":
      return "clients";
    case "nav":
      return "navigation";
    default:
      return "navigation";
  }
}

export const GROUP_ORDER: SearchGroupId[] = [
  "commands",
  "clients",
  "projects",
  "sales",
  "reports",
  "infrastructure",
  "creative",
  "strategy",
  "playbook",
  "client-success",
  "automation",
  "brain",
  "navigation",
];
