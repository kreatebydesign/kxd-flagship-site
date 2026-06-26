"use client";

import { useState } from "react";
import Link from "next/link";
import { CLIENT_IMPORT_EXAMPLES } from "@/lib/client-launch/examples/client-import-examples";
import { getCusickImportExampleJson } from "@/lib/client-launch/examples/cusick-motorsports-import";
import {
  LaunchFieldLabel,
  LaunchPanel,
} from "@/components/admin/operations/client-launch/LaunchFormPrimitives";
import { KxdButton, KxdTextarea } from "@/components/os";

type ImportSuccess = {
  success: true;
  mode: "created" | "updated";
  clientId: number;
  clientName: string;
  workspaceUrl: string;
};

type ImportFailure = {
  success: false;
  message: string;
  errors?: string[];
};

export function ClientImportTool() {
  const [jsonText, setJsonText] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [showExample, setShowExample] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportSuccess | null>(null);

  function loadExampleEntry(
    entry: (typeof CLIENT_IMPORT_EXAMPLES)[number],
    showCusickPreview = false,
  ) {
    setJsonText(entry.getJson());
    setRawNotes(entry.rawNotes ?? "");
    setShowExample(showCusickPreview);
    setErrors([]);
    setMessage("");
    setResult(null);
  }

  async function handleSubmit() {
    setErrors([]);
    setMessage("");
    setResult(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setErrors(["JSON is invalid. Check brackets, commas, and quotes."]);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/client-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: parsed,
          rawNotes: rawNotes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as ImportSuccess | ImportFailure;

      if (!res.ok || !data.success) {
        const failure = data as ImportFailure;
        setMessage(failure.message || "Import failed.");
        if (failure.errors?.length) setErrors(failure.errors);
        return;
      }

      setResult(data as ImportSuccess);
    } catch {
      setMessage("Network error — import could not complete.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <LaunchPanel title="Import complete">
        <p className="kxd-os-title">{result.clientName}</p>
        <p className="kxd-os-body" style={{ marginBottom: "1.5rem" }}>
          Client {result.mode === "created" ? "created" : "updated"} via KXD Client Import.
          Executive profile and timeline event recorded.
        </p>
        <div className="kxd-os-ops-workflow-actions">
          <Link href={result.workspaceUrl} className="kxd-os-btn kxd-os-btn--primary">
            Open Client Workspace
          </Link>
          <KxdButton
            variant="ghost"
            onClick={() => {
              setResult(null);
              setJsonText("");
              setRawNotes("");
            }}
          >
            Import Another
          </KxdButton>
        </div>
      </LaunchPanel>
    );
  }

  return (
    <div className="kxd-os-ops-workflow-stack">
      <LaunchPanel title="Security">
        <p className="kxd-os-body">
          Do not paste passwords, API keys, or private credentials. Store sensitive access in
          secure storage only — reference it in login notes without secrets.
        </p>
      </LaunchPanel>

      <LaunchPanel title="Structured JSON">
        <div className="kxd-os-ops-workflow-actions" style={{ marginBottom: "1rem" }}>
          {CLIENT_IMPORT_EXAMPLES.map((example) => (
            <KxdButton
              key={example.label}
              variant="secondary"
              size="sm"
              onClick={() =>
                loadExampleEntry(example, example.label === "Load Cusick Example")
              }
            >
              {example.label}
            </KxdButton>
          ))}
          <KxdButton variant="ghost" size="sm" onClick={() => setShowExample((v) => !v)}>
            {showExample ? "Hide Example" : "Show Example Structure"}
          </KxdButton>
        </div>

        {showExample && <pre className="kxd-os-ops-pre">{getCusickImportExampleJson()}</pre>}

        <div style={{ marginBottom: "1.25rem" }}>
          <LaunchFieldLabel>Raw notes (optional)</LaunchFieldLabel>
          <p className="kxd-os-body" style={{ marginBottom: "0.625rem" }}>
            Paste messy notes here for reference. Structured JSON below controls the actual client
            import.
          </p>
          <KxdTextarea
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            placeholder="Discovery notes, call summaries, conversation context…"
            rows={6}
          />
        </div>

        <LaunchFieldLabel>Client import JSON</LaunchFieldLabel>
        <KxdTextarea
          className="kxd-os-textarea--mono"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder='{ "business": { "businessName": "..." }, "contacts": { ... }, ... }'
          rows={18}
        />

        {(errors.length > 0 || message) && (
          <div className="kxd-os-ops-alert kxd-os-ops-alert--error" style={{ marginTop: "1rem" }}>
            {message && <p>{message}</p>}
            {errors.map((err) => (
              <p key={err}>{err}</p>
            ))}
          </div>
        )}

        <div style={{ marginTop: "1.25rem" }}>
          <KxdButton
            onClick={handleSubmit}
            disabled={submitting || !jsonText.trim()}
            loading={submitting}
          >
            {submitting ? "Importing…" : "Import Client"}
          </KxdButton>
        </div>
      </LaunchPanel>

      <LaunchPanel title="Sections">
        <p className="kxd-os-body" style={{ lineHeight: 1.7 }}>
          JSON should include the same sections as Client Launch:{" "}
          <code className="kxd-os-ops-code">business</code>,{" "}
          <code className="kxd-os-ops-code">contacts</code>,{" "}
          <code className="kxd-os-ops-code">financial</code>,{" "}
          <code className="kxd-os-ops-code">services</code>,{" "}
          <code className="kxd-os-ops-code">technical</code>,{" "}
          <code className="kxd-os-ops-code">executive</code>, and{" "}
          <code className="kxd-os-ops-code">roadmap</code>. Existing clients match by slug or
          business name and are updated safely.
        </p>
      </LaunchPanel>
    </div>
  );
}
