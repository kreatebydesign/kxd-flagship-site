/** Future Genesis capabilities — architecture stubs only */

import type { GenesisFutureCapabilities } from "./types";
import { GENESIS_FUTURE_CAPABILITIES } from "./types";

export interface GenesisWebsiteCrawlerAdapter {
  id: string;
  isConfigured(): boolean;
  crawl?(url: string): Promise<{ pages: string[]; issues: string[] }>;
}

export interface GenesisCompetitorAnalysisAdapter {
  id: string;
  isConfigured(): boolean;
  analyze?(competitors: string[]): Promise<{ insights: string[] }>;
}

export interface GenesisAiPlanningAdapter {
  id: string;
  isConfigured(): boolean;
}

export interface GenesisClientPortalQuestionnaireAdapter {
  id: string;
  isConfigured(): boolean;
}

export interface GenesisVoiceIntakeAdapter {
  id: string;
  isConfigured(): boolean;
}

export interface GenesisMeetingTranscriptionAdapter {
  id: string;
  isConfigured(): boolean;
}

export const GENESIS_ADAPTER_PLACEHOLDERS = [
  { id: "website-crawler", label: "Website Crawling", status: "not-configured" as const },
  { id: "competitor-analysis", label: "Competitor Analysis", status: "not-configured" as const },
  { id: "ai-planning", label: "AI-assisted Planning", status: "not-configured" as const },
  { id: "sitemap-generator", label: "Automatic Sitemap Generation", status: "not-configured" as const },
  { id: "copy-generator", label: "Automatic Copy Generation", status: "not-configured" as const },
  { id: "proposal-generator", label: "Automatic Proposal Generation", status: "not-configured" as const },
  { id: "client-questionnaire", label: "Client Questionnaire Portal", status: "not-configured" as const },
  { id: "voice-intake", label: "Voice Intake", status: "not-configured" as const },
  { id: "meeting-transcription", label: "Meeting Transcription", status: "not-configured" as const },
] as const;

export function getGenesisFutureCapabilities(): GenesisFutureCapabilities {
  return { ...GENESIS_FUTURE_CAPABILITIES };
}

export function isGenesisFutureCapabilityEnabled(
  key: keyof GenesisFutureCapabilities,
): boolean {
  return GENESIS_FUTURE_CAPABILITIES[key];
}
