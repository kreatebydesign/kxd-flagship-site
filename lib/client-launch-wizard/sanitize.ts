const SECRET_KEY_RE =
  /(password|secret|token|credential|authorization|apikey|api_key|connectionstring|private[_-]?key)/i;

export function sanitizeLaunchFailureMessage(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    return "Launch failed. Resolve the blocker and retry.";
  }
  let message = raw.replace(/\s+/g, " ").trim().slice(0, 280);
  if (SECRET_KEY_RE.test(message)) {
    return "Launch failed. Sensitive details were withheld.";
  }
  message = message
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "[redacted]")
    .replace(/sk-[A-Za-z0-9]+/g, "[redacted]")
    .replace(/postgres(ql)?:\/\/[^\s]+/gi, "[redacted]");
  return message;
}

export function assertNoSecretsInDraftJson(value: unknown, path = "draft"): string[] {
  const hits: string[] = [];
  if (value === null || value === undefined) return hits;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      hits.push(...assertNoSecretsInDraftJson(item, `${path}[${index}]`));
    });
    return hits;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_RE.test(key)) {
        hits.push(`${path}.${key}`);
      }
      hits.push(...assertNoSecretsInDraftJson(child, `${path}.${key}`));
    }
  }
  return hits;
}
