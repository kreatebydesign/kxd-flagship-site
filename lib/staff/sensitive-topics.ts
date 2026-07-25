/**
 * Centralized deterministic sensitive-topic classifier for KXD Intelligence.
 * Facts-only permission gate — not AI. Used by staff help (and operations mentor).
 *
 * Ambiguous questions that may create financial, legal, access, HR, publishing,
 * or client commitments escalate to Matt.
 */

type SensitiveRule = {
  topic: string;
  patterns: RegExp[];
};

/**
 * Normalize employee questions so punctuation, casing, and slang still match.
 * Keeps matching deterministic and synonym-friendly.
 */
export function normalizeSensitiveQuestion(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\$\s*([\d,]+(?:\.\d+)?)/g, " dollaramount $1 ")
    .replace(/\$+/g, " dollaramount ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SENSITIVE_RULES: SensitiveRule[] = [
  {
    topic: "unsafe instructions",
    patterns: [
      /\b(ignore (previous|all) instructions|system prompt|jailbreak|developer mode)\b/,
    ],
  },
  {
    topic: "pricing",
    patterns: [
      /\b(pric(e|ed|es|ing)|charge|charges|charging|cost|costs|costing|quote|quotes|quoting|estimat(e|es|ed|ing)|rate|rates|fee|fees|discount|discounts|deposit|deposits|retainer|retainers)\b/,
      /\b(how much|what should we charge|what do we charge|what to charge)\b/,
      /\b(monthly fee|hourly rate|retainer amount|proposal amount|invoice amount)\b/,
      /\bdollaramount\b/,
      /\b(change|switch|select|upgrade|downgrade|pick|adjust).{0,40}\bpackage\b/,
      /\bpackage.{0,40}\b(change|switch|select|upgrade|downgrade|price|cost|fee|rate)\b/,
      /\b(invoice).{0,40}\b(amount|adjust|change|reduce|increase|waive|edit|update)\b/,
      /\b(adjust|change|reduce|increase|waive|edit|update).{0,40}\binvoice\b/,
    ],
  },
  {
    topic: "financial execution",
    patterns: [
      /\b(refund|refunds|payout|payouts|wire transfer|charge the card|stripe)\b/,
      /\b(billing terms?|payment terms?|net\s*\d+)\b/,
      /\b(financial commitment|money movement|process (this )?payment)\b/,
    ],
  },
  {
    topic: "scope changes",
    patterns: [
      /\b(scope change|change (the )?scope|add scope|reduce (the )?scope|scope (add|addition|reduction|reduc))\b/,
      /\b(add|remove|cut|expand).{0,30}\bscope\b/,
    ],
  },
  {
    topic: "legal",
    patterns: [
      /\b(contract|contracts|addendum|addenda|legal|liability|nda|indemnit\w*)\b/,
      /\b(contract terms?|legal interpretation)\b/,
    ],
  },
  {
    topic: "client commitments",
    patterns: [
      /\b(promise|promises|promising|guarantee|guarantees|guaranteeing)\b/,
      /\b(commit(ment)? to (the )?client|promise (the )?client|guarantee delivery)\b/,
      /\b(can i|should i|may i|promise|commit).{0,80}\b(finished|done|ready|deliver(ed|y)?).{0,24}\b(by|friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/,
      /\b(commit|committed|committing).{0,40}\b(client|deadline|delivery|friday|date)\b/,
    ],
  },
  {
    topic: "access or entitlements",
    patterns: [
      /\b(give|grant|revoke|remove).{0,24}\b(access|permission|permissions|entitlement|entitlements)\b/,
      /\b(access|permission|permissions|entitlement|entitlements)\b/,
      /\b(make (them|her|him) admin|admin access|security clearance|vpn|password)\b/,
      /\b(role change|change (their|the|his|her) role)\b/,
    ],
  },
  {
    topic: "HR",
    patterns: [/\b(terminate|termination|fire|fired|firing|hire|hiring|salary|payroll|hr decision)\b/],
  },
  {
    topic: "external communications or publishing",
    patterns: [
      /\b(publish|publishing|go live|make it live)\b/,
      /\b(send|email|mail).{0,24}\b(to )?(the )?client\b/,
      /\b(client[- ]facing|external (send|email|message))\b/,
    ],
  },
  {
    topic: "destructive actions",
    patterns: [
      /\b(delete|destroy|wipe|purge).{0,40}\b(record|client|account|database|production|user)\b/,
      /\b(can i|should i|may i).{0,20}\b(delete|destroy|wipe)\b/,
    ],
  },
];

/**
 * Detect whether a staff/ops question requires Matt before acting.
 * Returns a stable topic label, or null when routine guidance is allowed.
 */
export function detectSensitiveTopic(question: string | null | undefined): string | null {
  const normalized = normalizeSensitiveQuestion(question ?? "");
  if (!normalized) return null;

  for (const rule of SENSITIVE_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(normalized)) return rule.topic;
    }
  }
  return null;
}
