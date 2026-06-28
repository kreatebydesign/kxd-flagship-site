/** Future Launch QA capabilities — architecture stubs only */

import type { LaunchQaFutureCapabilities } from "./types";
import { LAUNCH_QA_FUTURE_CAPABILITIES } from "./types";

export interface LighthouseAdapter {
  id: string;
  isConfigured(): boolean;
  runAudit?(url: string): Promise<{ score: number; issues: string[] }>;
}

export interface PlaywrightCheckAdapter {
  id: string;
  isConfigured(): boolean;
}

export interface BrokenLinkCrawlerAdapter {
  id: string;
  isConfigured(): boolean;
}

export interface AccessibilityScannerAdapter {
  id: string;
  isConfigured(): boolean;
}

export interface ScreenshotComparisonAdapter {
  id: string;
  isConfigured(): boolean;
}

export interface SearchConsoleVerificationAdapter {
  id: string;
  isConfigured(): boolean;
}

export interface Ga4VerificationAdapter {
  id: string;
  isConfigured(): boolean;
}

export const LAUNCH_QA_ADAPTER_PLACEHOLDERS = [
  { id: "lighthouse", label: "Lighthouse API", status: "not-configured" as const },
  { id: "playwright", label: "Playwright checks", status: "not-configured" as const },
  { id: "broken-links", label: "Broken link crawler", status: "not-configured" as const },
  { id: "a11y-scanner", label: "Accessibility scanner", status: "not-configured" as const },
  { id: "screenshot-diff", label: "Screenshot comparison", status: "not-configured" as const },
  { id: "search-console", label: "Search Console verification", status: "not-configured" as const },
  { id: "ga4-verify", label: "GA4 verification", status: "not-configured" as const },
] as const;

export function getLaunchQaFutureCapabilities(): LaunchQaFutureCapabilities {
  return { ...LAUNCH_QA_FUTURE_CAPABILITIES };
}
