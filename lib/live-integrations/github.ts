import "server-only";

import { fetchJson } from "./cache";
import { envPresent, envValue } from "./status";
import type { NormalizedGitHub } from "./types";

export async function syncGitHub(): Promise<{
  normalized: NormalizedGitHub | null;
  recordsProcessed: number;
  error?: string;
}> {
  const token = envValue("GITHUB_TOKEN");
  if (!token) {
    return { normalized: null, recordsProcessed: 0, error: "GITHUB_TOKEN not configured" };
  }

  const userRes = await fetchJson<{ login?: string }>("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!userRes.ok) {
    return { normalized: null, recordsProcessed: 0, error: userRes.error };
  }

  const repoSlug = envValue("GITHUB_REPOSITORY");
  let normalized: NormalizedGitHub = {
    repository: repoSlug ?? null,
    latestCommit: null,
    deploymentBranch: null,
    openIssues: null,
    lastPush: null,
    contributors: null,
    authenticatedUser: userRes.data.login ?? null,
  };

  let records = 1;

  if (repoSlug) {
    const repoRes = await fetchJson<{
      default_branch?: string;
      pushed_at?: string;
      open_issues_count?: number;
    }>(`https://api.github.com/repos/${repoSlug}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (repoRes.ok) {
      normalized = {
        ...normalized,
        deploymentBranch: repoRes.data.default_branch ?? null,
        lastPush: repoRes.data.pushed_at ?? null,
        openIssues: repoRes.data.open_issues_count ?? null,
      };
      records += 1;

      const commitsRes = await fetchJson<Array<{ sha?: string }>>(
        `https://api.github.com/repos/${repoSlug}/commits?per_page=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );

      if (commitsRes.ok && commitsRes.data[0]?.sha) {
        normalized.latestCommit = commitsRes.data[0].sha.slice(0, 7);
        records += 1;
      }

      const contribRes = await fetchJson<Array<{ author?: { login?: string } }>>(
        `https://api.github.com/repos/${repoSlug}/contributors?per_page=1&anon=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );

      if (contribRes.ok) {
        normalized.contributors = contribRes.data.length;
        records += 1;
      }
    }
  }

  return { normalized, recordsProcessed: records };
}

export function isGitHubConfigured(): boolean {
  return envPresent("GITHUB_TOKEN");
}
