/**
 * Authenticated `vercel curl` against a protected Preview deployment.
 * Uses the CLI-linked project's Protection Bypass for Automation (never logged).
 */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export type VercelCurlResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

let cachedBypass: string | null = null;

function parseRawHttp(raw: string): VercelCurlResponse {
  const sep = raw.includes("\r\n\r\n") ? "\r\n\r\n" : "\n\n";
  const [head, ...rest] = raw.split(sep);
  const body = rest.join(sep);
  const statusLine = head.split(/\r?\n/)[0] ?? "";
  const statusMatch = / (\d{3}) /.exec(statusLine);
  const headers: Record<string, string> = {};
  for (const line of head.split(/\r?\n/).slice(1)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "set-cookie") {
      headers[key] = headers[key] ? `${headers[key]}\n${value}` : value;
    } else {
      headers[key] = value;
    }
  }
  return {
    status: statusMatch ? Number(statusMatch[1]) : 0,
    headers,
    body,
  };
}

export function extractPayloadTokenCookie(setCookie: string | undefined): string | null {
  if (!setCookie) return null;
  const match = /payload-token=([^;\s]+)/.exec(setCookie.replace(/\n/g, "; "));
  return match?.[1] ?? null;
}

async function runVercelCurl(
  deployment: string,
  apiPath: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number }> {
  const child = spawn(
    "vercel",
    ["curl", apiPath, "--deployment", deployment, ...args],
    {
      cwd: repoRoot,
      env: { ...process.env, VERCEL_TOKEN: "" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (c) => {
    stdout += String(c);
  });
  child.stderr.on("data", (c) => {
    stderr += String(c);
  });
  return await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve({ stdout, stderr, code: code ?? 1 }));
  });
}

/** Resolve bypass header value via linked Vercel CLI (cached). Never prints the secret. */
export async function resolveVercelProtectionBypass(deployment: string): Promise<string> {
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()) {
    return process.env.VERCEL_AUTOMATION_BYPASS_SECRET.trim();
  }
  if (cachedBypass) return cachedBypass;
  const probe = spawnSync(
    "vercel",
    ["--debug", "curl", "/admin/login", "--deployment", deployment],
    {
      cwd: repoRoot,
      env: { ...process.env, VERCEL_TOKEN: "" },
      encoding: "utf8",
      timeout: 90_000,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  const combined = `${probe.stderr ?? ""}\n${probe.stdout ?? ""}`;
  if (probe.error) {
    throw new Error(
      "Could not resolve Vercel protection bypass. Link CLI (`vercel link`) or set VERCEL_AUTOMATION_BYPASS_SECRET locally.",
    );
  }
  const match =
    /protection bypass token from project settings:\s*(\S+)/i.exec(combined) ||
    /x-vercel-protection-bypass:\s*([^\s"]+)/i.exec(combined);
  if (!match?.[1]) {
    throw new Error("Vercel CLI did not return a protection bypass token.");
  }
  cachedBypass = match[1];
  return cachedBypass;
}

export async function vercelDeploymentCurl(
  deployment: string,
  apiPath: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    includeHeaders?: boolean;
  } = {},
): Promise<VercelCurlResponse> {
  const args: string[] = [];
  if (init.includeHeaders) args.push("-i");
  if (init.method) args.push("-X", init.method);
  for (const [key, value] of Object.entries(init.headers ?? {})) {
    args.push("-H", `${key}: ${value}`);
  }
  if (init.body) args.push("-d", init.body);

  const { stdout, stderr, code } = await runVercelCurl(deployment, apiPath, args);
  if (code !== 0) {
    throw new Error(
      `vercel curl ${apiPath} failed (${code}): ${stderr.slice(0, 300).replace(/x-vercel-protection-bypass:\s*\S+/gi, "x-vercel-protection-bypass: [redacted]")}`,
    );
  }
  if (init.includeHeaders) {
    return parseRawHttp(stdout);
  }
  return { status: 200, headers: {}, body: stdout };
}
