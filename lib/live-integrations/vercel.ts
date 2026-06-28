import "server-only";

import { fetchJson } from "./cache";
import { envPresent, envValue } from "./status";
import type { NormalizedVercel } from "./types";

interface VercelDeployment {
  name?: string;
  url?: string;
  state?: string;
  ready?: number;
  buildingAt?: number;
  alias?: string[];
  meta?: { githubCommitRef?: string };
}

export async function syncVercel(): Promise<{
  normalized: NormalizedVercel | null;
  recordsProcessed: number;
  error?: string;
}> {
  const token = envValue("VERCEL_TOKEN");
  if (!token) {
    if (envPresent("VERCEL")) {
      return {
        normalized: {
          latestDeployment: null,
          deploymentStatus: "runtime-detected",
          productionUrl: null,
          previewUrl: null,
          buildDurationMs: null,
          buildErrors: [],
          projectName: envValue("VERCEL_PROJECT_NAME") ?? null,
        },
        recordsProcessed: 0,
      };
    }
    return { normalized: null, recordsProcessed: 0, error: "VERCEL_TOKEN not configured" };
  }

  const headers = { Authorization: `Bearer ${token}` };
  let records = 0;

  const projectId = envValue("VERCEL_PROJECT_ID");
  let projectName: string | null = envValue("VERCEL_PROJECT_NAME") ?? null;

  if (!projectId) {
    const projectsRes = await fetchJson<{ projects?: Array<{ id: string; name: string }> }>(
      "https://api.vercel.com/v9/projects?limit=1",
      { headers },
    );
    if (projectsRes.ok && projectsRes.data.projects?.[0]) {
      projectName = projectsRes.data.projects[0].name;
      records += 1;
    }
  }

  const deploymentsUrl = projectId
    ? `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1`
    : "https://api.vercel.com/v6/deployments?limit=1";

  const deployRes = await fetchJson<{ deployments?: VercelDeployment[] }>(deploymentsUrl, { headers });
  if (!deployRes.ok) {
    return { normalized: null, recordsProcessed: records, error: deployRes.error };
  }

  const deployment = deployRes.data.deployments?.[0];
  records += 1;

  if (!deployment) {
    return {
      normalized: {
        latestDeployment: null,
        deploymentStatus: "no-deployments",
        productionUrl: null,
        previewUrl: null,
        buildDurationMs: null,
        buildErrors: [],
        projectName,
      },
      recordsProcessed: records,
    };
  }

  const buildDurationMs =
    deployment.ready && deployment.buildingAt
      ? deployment.ready - deployment.buildingAt
      : null;

  const buildErrors =
    deployment.state === "ERROR" || deployment.state === "FAILED"
      ? ["Deployment failed — check Vercel build logs"]
      : [];

  return {
    normalized: {
      latestDeployment: deployment.url ?? deployment.name ?? null,
      deploymentStatus: deployment.state ?? "unknown",
      productionUrl: deployment.alias?.[0] ?? deployment.url ?? null,
      previewUrl: deployment.url ?? null,
      buildDurationMs,
      buildErrors,
      projectName: deployment.name ?? projectName,
    },
    recordsProcessed: records,
  };
}

export function isVercelConfigured(): boolean {
  return envPresent("VERCEL_TOKEN") || envPresent("VERCEL");
}
