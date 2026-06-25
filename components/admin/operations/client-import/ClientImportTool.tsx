"use client";

import { useState } from "react";
import Link from "next/link";
import { LAUNCH_C } from "@/lib/client-launch/constants";
import { getCusickImportExampleJson } from "@/lib/client-launch/examples/cusick-motorsports-import";
import { LaunchFieldLabel, LaunchPanel } from "@/components/admin/operations/client-launch/LaunchFormPrimitives";

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

  function loadExample() {
    setJsonText(getCusickImportExampleJson());
    setShowExample(true);
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
        <p
          style={{
            fontFamily: LAUNCH_C.serif,
            fontSize: "1.5rem",
            fontWeight: 300,
            color: LAUNCH_C.cream,
            marginBottom: "0.75rem",
          }}
        >
          {result.clientName}
        </p>
        <p
          style={{
            fontFamily: LAUNCH_C.sans,
            fontSize: "0.875rem",
            color: LAUNCH_C.creamMuted,
            marginBottom: "1.5rem",
            lineHeight: 1.6,
          }}
        >
          Client {result.mode === "created" ? "created" : "updated"} via KXD Client Import.
          Executive profile and timeline event recorded.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <Link
            href={result.workspaceUrl}
            style={{
              fontFamily: LAUNCH_C.sans,
              fontSize: "0.6875rem",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: LAUNCH_C.bgBase,
              background: LAUNCH_C.gold,
              padding: "0.625rem 1.125rem",
              textDecoration: "none",
            }}
          >
            Open Client Workspace
          </Link>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setJsonText("");
              setRawNotes("");
            }}
            style={{
              fontFamily: LAUNCH_C.sans,
              fontSize: "0.6875rem",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: LAUNCH_C.goldDim,
              background: "transparent",
              border: `1px solid ${LAUNCH_C.borderGold}`,
              padding: "0.625rem 1.125rem",
              cursor: "pointer",
            }}
          >
            Import Another
          </button>
        </div>
      </LaunchPanel>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <LaunchPanel title="Security">
        <p
          style={{
            fontFamily: LAUNCH_C.sans,
            fontSize: "0.8125rem",
            color: LAUNCH_C.creamMuted,
            lineHeight: 1.6,
          }}
        >
          Do not paste passwords, API keys, or private credentials. Store sensitive access in
          secure storage only — reference it in login notes without secrets.
        </p>
      </LaunchPanel>

      <LaunchPanel title="Structured JSON">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <button
            type="button"
            onClick={loadExample}
            style={{
              fontFamily: LAUNCH_C.sans,
              fontSize: "0.6875rem",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: LAUNCH_C.gold,
              background: "transparent",
              border: `1px solid ${LAUNCH_C.borderGold}`,
              padding: "0.5rem 0.875rem",
              cursor: "pointer",
            }}
          >
            Load Cusick Example
          </button>
          <button
            type="button"
            onClick={() => setShowExample((v) => !v)}
            style={{
              fontFamily: LAUNCH_C.sans,
              fontSize: "0.6875rem",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: LAUNCH_C.goldDim,
              background: "transparent",
              border: `1px solid ${LAUNCH_C.border}`,
              padding: "0.5rem 0.875rem",
              cursor: "pointer",
            }}
          >
            {showExample ? "Hide Example" : "Show Example Structure"}
          </button>
        </div>

        {showExample && (
          <pre
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.6875rem",
              color: LAUNCH_C.creamMuted,
              background: LAUNCH_C.bgBase,
              border: `1px solid ${LAUNCH_C.border}`,
              padding: "1rem",
              marginBottom: "1rem",
              overflow: "auto",
              maxHeight: "14rem",
              lineHeight: 1.5,
            }}
          >
            {getCusickImportExampleJson()}
          </pre>
        )}

        <div style={{ marginBottom: "1.25rem" }}>
          <LaunchFieldLabel>Raw notes (optional)</LaunchFieldLabel>
          <p
            style={{
              fontFamily: LAUNCH_C.sans,
              fontSize: "0.8125rem",
              color: LAUNCH_C.creamMuted,
              lineHeight: 1.6,
              marginBottom: "0.625rem",
            }}
          >
            Paste messy notes here for reference. Structured JSON below controls the actual
            client import.
          </p>
          <textarea
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            placeholder="Discovery notes, call summaries, conversation context…"
            rows={6}
            style={{
              width: "100%",
              fontFamily: LAUNCH_C.sans,
              fontSize: "0.8125rem",
              color: LAUNCH_C.cream,
              background: LAUNCH_C.bgBase,
              border: `1px solid ${LAUNCH_C.border}`,
              padding: "0.875rem 1rem",
              outline: "none",
              resize: "vertical",
              lineHeight: 1.55,
            }}
          />
        </div>

        <LaunchFieldLabel>Client import JSON</LaunchFieldLabel>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder='{ "business": { "businessName": "..." }, "contacts": { ... }, ... }'
          rows={18}
          style={{
            width: "100%",
            fontFamily: "ui-monospace, monospace",
            fontSize: "0.8125rem",
            color: LAUNCH_C.cream,
            background: LAUNCH_C.bgBase,
            border: `1px solid ${LAUNCH_C.border}`,
            padding: "1rem",
            outline: "none",
            resize: "vertical",
            lineHeight: 1.55,
          }}
        />

        {(errors.length > 0 || message) && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.875rem 1rem",
              border: `1px solid ${LAUNCH_C.red}`,
              background: "rgba(210,90,90,0.08)",
            }}
          >
            {message && (
              <p
                style={{
                  fontFamily: LAUNCH_C.sans,
                  fontSize: "0.8125rem",
                  color: LAUNCH_C.red,
                  marginBottom: errors.length ? "0.5rem" : 0,
                }}
              >
                {message}
              </p>
            )}
            {errors.map((err) => (
              <p
                key={err}
                style={{
                  fontFamily: LAUNCH_C.sans,
                  fontSize: "0.8125rem",
                  color: LAUNCH_C.red,
                  lineHeight: 1.5,
                }}
              >
                {err}
              </p>
            ))}
          </div>
        )}

        <div style={{ marginTop: "1.25rem" }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !jsonText.trim()}
            style={{
              fontFamily: LAUNCH_C.sans,
              fontSize: "0.6875rem",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: LAUNCH_C.bgBase,
              background: submitting ? LAUNCH_C.goldDim : LAUNCH_C.gold,
              border: "none",
              padding: "0.625rem 1.25rem",
              cursor: submitting || !jsonText.trim() ? "not-allowed" : "pointer",
              opacity: submitting || !jsonText.trim() ? 0.65 : 1,
            }}
          >
            {submitting ? "Importing…" : "Import Client"}
          </button>
        </div>
      </LaunchPanel>

      <LaunchPanel title="Sections">
        <p
          style={{
            fontFamily: LAUNCH_C.sans,
            fontSize: "0.8125rem",
            color: LAUNCH_C.creamMuted,
            lineHeight: 1.7,
          }}
        >
          JSON should include the same sections as Client Launch:{" "}
          <code style={{ color: LAUNCH_C.gold }}>business</code>,{" "}
          <code style={{ color: LAUNCH_C.gold }}>contacts</code>,{" "}
          <code style={{ color: LAUNCH_C.gold }}>financial</code>,{" "}
          <code style={{ color: LAUNCH_C.gold }}>services</code>,{" "}
          <code style={{ color: LAUNCH_C.gold }}>technical</code>,{" "}
          <code style={{ color: LAUNCH_C.gold }}>executive</code>, and{" "}
          <code style={{ color: LAUNCH_C.gold }}>roadmap</code>. Existing clients
          match by slug or business name and are updated safely.
        </p>
      </LaunchPanel>
    </div>
  );
}
