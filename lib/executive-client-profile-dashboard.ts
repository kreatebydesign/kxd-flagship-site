import { normalizeWebsiteHostname } from "@/lib/client-launch/match-website-host";

export interface ClientDuplicateCandidate {
  id: number;
  name: string;
  status: string | null;
  website: string | null;
}

/** Display-only duplicate hints — does not modify data. */
export function buildClientDuplicateWarnings(
  clients: ClientDuplicateCandidate[],
): Map<number, string> {
  const warnings = new Map<number, string>();
  const active = clients.filter((c) => c.status === "active");

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      const hostA = normalizeWebsiteHostname(a.website);
      const hostB = normalizeWebsiteHostname(b.website);

      if (hostA && hostB && hostA === hostB) {
        const msg = `Possible duplicate — same domain as ${b.name}`;
        const msgB = `Possible duplicate — same domain as ${a.name}`;
        warnings.set(a.id, msg);
        warnings.set(b.id, msgB);
        continue;
      }

      if (hasSimilarClientName(a.name, b.name)) {
        const msg = `Possible duplicate — similar name to ${b.name}`;
        const msgB = `Possible duplicate — similar name to ${a.name}`;
        if (!warnings.has(a.id)) warnings.set(a.id, msg);
        if (!warnings.has(b.id)) warnings.set(b.id, msgB);
      }
    }
  }

  return warnings;
}

function hasSimilarClientName(a: string, b: string): boolean {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (!na || !nb || na === nb) return na === nb;
  if (na.includes(nb) || nb.includes(na)) return true;

  const tokensA = nameTokens(na);
  const tokensB = nameTokens(nb);
  const shared = tokensA.filter((t) => tokensB.includes(t));
  return shared.length >= 2;
}

function nameTokens(name: string): string[] {
  return name
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 3);
}
