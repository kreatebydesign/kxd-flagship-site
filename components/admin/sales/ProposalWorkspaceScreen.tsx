"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { ProposalCurrencyInput } from "@/components/admin/sales/ProposalCurrencyInput";
import {
  buildTemplateDocument,
  emptyProposalDocument,
  newId,
  normalizeProposalDocument,
  prefillIdentityFromProspect,
} from "@/lib/proposal-builder/document";
import {
  clearProposalDraftRecovery,
  readProposalDraftRecovery,
  writeProposalDraftRecovery,
} from "@/lib/proposal-builder/draft-recovery";
import {
  calendarDateToStoredInstant,
  toProposalCalendarDateString,
} from "@/lib/proposal-builder/calendar-date";
import { formatCents } from "@/lib/proposal-builder/money";
import { calculateProposalTotals } from "@/lib/proposal-builder/pricing";
import type {
  ProposalDocument,
  ProposalPricingLine,
  ProposalScopeGroup,
  ProposalTemplateKind,
} from "@/lib/proposal-builder/types";
import {
  formatUsPhoneInput,
  normalizePhoneForStorage,
} from "@/lib/formatting/phone-us";
import { fmtDate, resolveName, type SalesUiDoc } from "./shared";
import { parseHttpsBookingUrl } from "@/lib/proposal-builder/booking-url";

type TabId = "identity" | "executive" | "scope" | "pricing" | "terms" | "share" | "contract";

const DELIVERY_METHODS = [
  { value: "email", label: "Email (manual)" },
  { value: "text-message", label: "Text / message" },
  { value: "copied-link", label: "Copied link" },
  { value: "other", label: "Other" },
] as const;

type OperatorShareState = {
  status: string;
  shareApprovedAt: string | null;
  hasShareSnapshot: boolean;
  hasActiveShareLink: boolean;
  sentAt: string | null;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  manualDelivery: {
    method: string;
    deliveredAt: string;
    recipient?: string | null;
    note?: string | null;
  } | null;
  liveDealProtected: boolean;
  rawTokenRecoverable: false;
};

const TEMPLATE_OPTIONS: Array<{ value: ProposalTemplateKind | ""; label: string }> = [
  { value: "", label: "Blank proposal" },
  { value: "website-design-development", label: "Website design & development" },
  { value: "monthly-website-management", label: "Monthly website management" },
  { value: "marketing-advertising-management", label: "Marketing & advertising" },
  { value: "combined-project-retainer", label: "Combined project + retainer" },
  { value: "sponsorship-trade-partnership", label: "Sponsorship / trade partnership" },
  { value: "custom-professional-services", label: "Custom professional services" },
];

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid var(--kxd-os-line, #e2d8c8)",
  background: "var(--kxd-os-paper, #fffdf8)",
  borderRadius: 2,
  padding: "0.65rem 0.75rem",
  font: "inherit",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--kxd-os-muted, #6f6a62)",
  marginBottom: 6,
};

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  // Explicit label association — avoid wrapping controls in <label>, which can
  // interfere with Space / activation behavior for nested interactive content.
  return (
    <div style={{ display: "block", marginBottom: "1rem" }}>
      <label htmlFor={htmlFor} style={labelStyle}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function ProposalWorkspaceScreen({
  mode,
  proposal,
  leads,
  clients,
  initialLeadId,
  initialClientId,
  operatorEmail = "",
}: {
  mode: "create" | "edit";
  proposal?: SalesUiDoc | null;
  leads: SalesUiDoc[];
  clients: SalesUiDoc[];
  initialLeadId?: number;
  initialClientId?: number;
  /** Used to scope local draft recovery — never stored as a secret. */
  operatorEmail?: string;
}) {
  const router = useRouter();
  const recoveryReady = useRef(false);
  const [tab, setTab] = useState<TabId>("identity");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const [draftEditUrl, setDraftEditUrl] = useState<string | null>(
    mode === "edit" && proposal?.id ? `/admin/sales/proposals/${proposal.id}` : null,
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareState, setShareState] = useState<OperatorShareState | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [replaceAcknowledged, setReplaceAcknowledged] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<(typeof DELIVERY_METHODS)[number]["value"]>("email");
  const [deliveryRecipient, setDeliveryRecipient] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [deliveryAt, setDeliveryAt] = useState(() => toProposalCalendarDateString(new Date().toISOString()));
  const [leadOptions, setLeadOptions] = useState<SalesUiDoc[]>(leads);
  const [showCreateProspect, setShowCreateProspect] = useState(false);
  const [prospectBusy, setProspectBusy] = useState(false);
  const [prospectError, setProspectError] = useState<string | null>(null);
  const [prospectForm, setProspectForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    notes: "",
  });

  const [title, setTitle] = useState(String(proposal?.title ?? ""));
  const [leadId, setLeadId] = useState<number | "">(
    initialLeadId ??
      (typeof proposal?.lead === "object" ? proposal.lead?.id : proposal?.lead) ??
      "",
  );
  const [clientId, setClientId] = useState<number | "">(
    initialClientId ??
      (typeof proposal?.client === "object" ? proposal.client?.id : proposal?.client) ??
      "",
  );
  const [proposalDate, setProposalDate] = useState(
    proposal?.proposalDate
      ? toProposalCalendarDateString(String(proposal.proposalDate))
      : toProposalCalendarDateString(new Date().toISOString()),
  );
  const [expiresAt, setExpiresAt] = useState(
    proposal?.expiresAt ? toProposalCalendarDateString(String(proposal.expiresAt)) : "",
  );
  const [internalOwner, setInternalOwner] = useState(String(proposal?.internalOwner ?? ""));
  const [templateKind, setTemplateKind] = useState<ProposalTemplateKind | "">("");
  const [document, setDocument] = useState<ProposalDocument>(() =>
    normalizeProposalDocument(proposal?.builderDocument) || emptyProposalDocument(),
  );
  const [contract, setContract] = useState<SalesUiDoc | null>(null);
  const [contractBody, setContractBody] = useState("");

  const totals = useMemo(() => calculateProposalTotals(document), [document]);
  const status = String(proposal?.status ?? "draft");
  const editable = mode === "create" || ["draft", "internal-review", "revision-requested"].includes(status);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (mode !== "edit" || !proposal?.id) return;
    fetch(`/api/admin/proposal-builder/${proposal.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.contract) {
          setContract(json.contract);
          setContractBody(String(json.contract.body ?? ""));
        }
        if (json.shareState) {
          setShareState(json.shareState as OperatorShareState);
        }
      })
      .catch(() => undefined);
  }, [mode, proposal?.id]);

  // Restore operator-scoped local recovery after refresh / hot reload / crash.
  useEffect(() => {
    if (!operatorEmail.trim()) {
      recoveryReady.current = true;
      return;
    }
    const proposalKey: number | "new" =
      mode === "edit" && proposal?.id ? Number(proposal.id) : "new";
    const recovered = readProposalDraftRecovery(operatorEmail, proposalKey);
    recoveryReady.current = true;
    if (!recovered) return;

    if (mode === "edit" && proposal?.updatedAt) {
      const serverAt = new Date(String(proposal.updatedAt)).getTime();
      const localAt = new Date(recovered.savedAt).getTime();
      if (Number.isFinite(serverAt) && Number.isFinite(localAt) && localAt <= serverAt) {
        clearProposalDraftRecovery(operatorEmail, proposalKey);
        return;
      }
    }

    // Defer restore so localStorage hydration is not a synchronous effect setState cascade.
    const timer = window.setTimeout(() => {
      setTitle(recovered.title);
      setLeadId(recovered.leadId);
      setClientId(recovered.clientId);
      setProposalDate(recovered.proposalDate);
      setExpiresAt(recovered.expiresAt);
      setInternalOwner(recovered.internalOwner);
      setTemplateKind((recovered.templateKind as ProposalTemplateKind | "") || "");
      setDocument(normalizeProposalDocument(recovered.document));
      setDirty(true);
      setNotice("Recovered unsaved changes");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [operatorEmail, mode, proposal?.id, proposal?.updatedAt]);

  // Autosave incomplete form state locally while typing (no secrets).
  useEffect(() => {
    if (!recoveryReady.current || !operatorEmail.trim() || !dirty) return;
    if (!editable && mode === "edit") return;
    const proposalKey: number | "new" =
      mode === "edit" && proposal?.id ? Number(proposal.id) : "new";
    const handle = window.setTimeout(() => {
      writeProposalDraftRecovery({
        version: 1,
        operatorEmail,
        proposalId: proposalKey,
        savedAt: new Date().toISOString(),
        title,
        leadId,
        clientId,
        proposalDate,
        expiresAt,
        internalOwner,
        templateKind,
        document,
      });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [
    operatorEmail,
    dirty,
    editable,
    mode,
    proposal?.id,
    title,
    leadId,
    clientId,
    proposalDate,
    expiresAt,
    internalOwner,
    templateKind,
    document,
  ]);

  function updateDocument(next: ProposalDocument) {
    setDocument(next);
    setDirty(true);
    setError(null);
  }

  function selectProspectLead(lead: SalesUiDoc, message: string) {
    const id = Number(lead.id);
    setLeadOptions((prev) => {
      if (prev.some((l) => Number(l.id) === id)) return prev;
      return [lead, ...prev];
    });
    setLeadId(id);
    setDirty(true);
    setShowCreateProspect(false);
    setProspectError(null);
    setProspectForm({
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      website: "",
      notes: "",
    });

    // Prefill proposal identity helpers only when those fields are still empty.
    // Proposal phone/email remain independently editable — never overwrite non-empty values.
    setDocument((prev) => prefillIdentityFromProspect(prev, lead));
    setNotice(message);
  }

  async function createProspect() {
    if (!prospectForm.companyName.trim() || !prospectForm.contactName.trim()) {
      setProspectError("Organization name and primary contact name are required.");
      return;
    }
    setProspectBusy(true);
    setProspectError(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/sales/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: prospectForm.companyName.trim(),
          contactName: prospectForm.contactName.trim(),
          email: prospectForm.email.trim() || undefined,
          phone: normalizePhoneForStorage(prospectForm.phone) || undefined,
          website: prospectForm.website.trim() || undefined,
          notes: prospectForm.notes.trim() || undefined,
          source: "proposal-builder",
        }),
      });
      const json = await res.json();
      if (res.status === 409 && json.lead) {
        selectProspectLead(
          json.lead,
          "Existing open prospect selected — no duplicate created. Proposal fields kept.",
        );
        return;
      }
      if (!res.ok || !json.success || !json.lead) {
        setProspectError(json.error ?? "Failed to create prospect.");
        return;
      }
      selectProspectLead(
        json.lead,
        json.reusedExisting
          ? "Existing open prospect selected. Proposal fields kept."
          : "Prospect created and selected. No client record was created.",
      );
    } catch {
      setProspectError("Failed to create prospect.");
    } finally {
      setProspectBusy(false);
    }
  }

  function applyTemplate(kind: ProposalTemplateKind | "") {
    setTemplateKind(kind);
    if (!kind) {
      updateDocument(emptyProposalDocument());
      return;
    }
    updateDocument(buildTemplateDocument(kind));
  }

  async function saveDraft() {
    if (!title.trim()) {
      setError("Title is required to save a draft.");
      return;
    }
    const booking = parseHttpsBookingUrl(document.scheduleCallUrl);
    if (!booking.ok) {
      setError(booking.error);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "create") {
        const res = await fetch("/api/admin/proposal-builder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            leadId: leadId || undefined,
            clientId: clientId || undefined,
            templateKind: templateKind || undefined,
            document,
            proposalDate: calendarDateToStoredInstant(proposalDate) || undefined,
            expiresAt: calendarDateToStoredInstant(expiresAt) || undefined,
            internalOwner: internalOwner || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error ?? "Failed to save draft. Your entered content is still here.");
          return;
        }
        const savedAt = new Date().toISOString();
        const editPath = `/admin/sales/proposals/${json.id}`;
        setDirty(false);
        setLastDraftSavedAt(savedAt);
        setDraftEditUrl(editPath);
        if (operatorEmail.trim()) {
          clearProposalDraftRecovery(operatorEmail, "new");
        }
        setNotice(
          `Draft saved · ${new Date(savedAt).toLocaleString()} · Edit draft: ${editPath}`,
        );
        router.push(editPath);
        router.refresh();
        return;
      }

      const res = await fetch(`/api/admin/proposal-builder/${proposal?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          leadId: leadId || null,
          clientId: clientId || null,
          proposalDate: calendarDateToStoredInstant(proposalDate),
          expiresAt: calendarDateToStoredInstant(expiresAt),
          internalOwner: internalOwner || null,
          scheduleCallUrl: document.scheduleCallUrl || null,
          document,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to save draft. Your entered content is still here.");
        return;
      }
      const savedAt = new Date().toISOString();
      const editPath = `/admin/sales/proposals/${proposal?.id}`;
      setDirty(false);
      setLastDraftSavedAt(savedAt);
      setDraftEditUrl(editPath);
      if (operatorEmail.trim() && proposal?.id) {
        clearProposalDraftRecovery(operatorEmail, Number(proposal.id));
      }
      setNotice(
        `Draft saved · ${new Date(savedAt).toLocaleString()} · Edit draft: ${editPath}`,
      );
      router.refresh();
    } catch {
      setError("Failed to save draft. Your entered content is still here.");
    } finally {
      setBusy(false);
    }
  }

  async function postShare(body: Record<string, unknown>) {
    if (!proposal?.id) return null;
    const res = await fetch(`/api/admin/proposal-builder/${proposal.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? "Share action failed.");
    }
    if (json.shareState) setShareState(json.shareState as OperatorShareState);
    return json;
  }

  async function approveForSharing() {
    if (!proposal?.id) return;
    if (dirty) {
      setError("Save the draft before approving for sharing.");
      return;
    }
    setBusy(true);
    setError(null);
    setCopyStatus(null);
    try {
      await postShare({
        action: "approve",
        expiresAt: calendarDateToStoredInstant(expiresAt),
      });
      setNotice(
        "Approved for sharing. This does not email the client or mark the proposal as sent.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve for sharing.");
    } finally {
      setBusy(false);
    }
  }

  async function prepareShareLink() {
    if (!proposal?.id) return;
    if (dirty) {
      setError("Save the draft before preparing a share link.");
      return;
    }
    setBusy(true);
    setError(null);
    setCopyStatus(null);
    try {
      const json = await postShare({
        action: "prepare",
        expiresAt: calendarDateToStoredInstant(expiresAt),
      });
      if (!json) return;
      if (json.created && json.shareUrlPath) {
        setShareUrl(`${window.location.origin}${json.shareUrlPath}`);
        setNotice(
          "Share link prepared. Copy it now — KXD OS cannot recover the original URL later. Preparing a link does not email the client or mark the proposal as sent.",
        );
      } else {
        setNotice(
          "An active secure link already exists. The original URL cannot be recovered from storage. Copy it from this session if you still have it, or replace the link (that invalidates the previous client URL).",
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to prepare a share link.");
    } finally {
      setBusy(false);
    }
  }

  async function replaceShareLink() {
    if (!proposal?.id) return;
    if (!replaceAcknowledged) {
      setError("Confirm that replacing the link will invalidate the previous client URL.");
      return;
    }
    setBusy(true);
    setError(null);
    setCopyStatus(null);
    try {
      const json = await postShare({
        action: "replace",
        confirmReplace: true,
        expiresAt: calendarDateToStoredInstant(expiresAt),
      });
      if (!json?.shareUrlPath) return;
      setShareUrl(`${window.location.origin}${json.shareUrlPath}`);
      setReplaceAcknowledged(false);
      setNotice(
        "Previous client link is now invalid. Copy the new link below. This does not email the client or mark the proposal as sent.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to replace the share link.");
    } finally {
      setBusy(false);
    }
  }

  async function copyShareLink() {
    if (!shareUrl) {
      setCopyStatus("No recoverable URL in this session.");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus("Copied.");
      setNotice("Link copied. Copying does not rotate the link or mark the proposal as sent.");
    } catch {
      setCopyStatus("Copy failed — select the URL and copy it manually.");
    }
  }

  async function markAsSent() {
    if (!proposal?.id) return;
    setBusy(true);
    setError(null);
    try {
      const json = await postShare({
        action: "mark-sent",
        method: deliveryMethod,
        deliveredAt: calendarDateToStoredInstant(deliveryAt) || new Date().toISOString(),
        recipient: deliveryRecipient.trim() || null,
        note: deliveryNote.trim() || null,
      });
      if (!json) return;
      setNotice(
        json.alreadyMarked
          ? "Already marked as sent. No duplicate delivery activity was created."
          : "Marked as sent. This records manual delivery — KXD OS did not email the client.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as sent.");
    } finally {
      setBusy(false);
    }
  }

  async function saveContract() {
    if (!proposal?.id || !contract) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/proposal-builder/${proposal.id}/contract`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: contractBody }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to save contract.");
        return;
      }
      setContract(json.contract);
      setNotice("Contract draft saved. Still internal — not sent.");
    } catch {
      setError("Failed to save contract.");
    } finally {
      setBusy(false);
    }
  }

  async function transitionContractStatus(next: string) {
    if (!proposal?.id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/proposal-builder/${proposal.id}/contract`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Invalid contract transition.");
        return;
      }
      setContract(json.contract);
      setNotice(`Contract status → ${next}`);
    } catch {
      setError("Failed to update contract status.");
    } finally {
      setBusy(false);
    }
  }

  function addScopeGroup() {
    const group: ProposalScopeGroup = {
      id: newId("scope"),
      title: "New scope group",
      overview: "",
      deliverables: [{ id: newId("del"), title: "Deliverable", sortOrder: 1 }],
      sortOrder: document.scopeGroups.length + 1,
      inclusion: "included",
    };
    updateDocument({ ...document, scopeGroups: [...document.scopeGroups, group] });
  }

  function addPricingLine(partial?: Partial<ProposalPricingLine>) {
    const line: ProposalPricingLine = {
      id: newId("line"),
      title: "Pricing line",
      cadence: "one-time",
      quantity: 1,
      unitPriceCents: 0,
      inclusion: "included",
      sortOrder: document.pricingLines.length + 1,
      ...partial,
    };
    updateDocument({ ...document, pricingLines: [...document.pricingLines, line] });
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "identity", label: "Identity" },
    { id: "executive", label: "Executive" },
    { id: "scope", label: "Scope" },
    { id: "pricing", label: "Pricing" },
    { id: "terms", label: "Terms" },
    { id: "share", label: "Share" },
    { id: "contract", label: "Contract" },
  ];

  const orgsLabel = document.organizations.map((o) => o.name).filter(Boolean).join(" · ") || "—";

  return (
    <OperationsShell activeId="sales-proposals">
      <KxdPage>
        <OperationsPageHero
          eyebrow="Proposals"
          title={mode === "create" ? "New proposal" : title || "Proposal"}
          lead={
            mode === "create"
              ? "Build the proposal, save as draft anytime, then preview before sharing. Acceptance prepares a contract draft — it does not sign or charge."
              : `${String(proposal?.proposalNumber ?? "")} · ${status} · v${String(proposal?.revisionNumber ?? 1)}`
          }
          presence
        />

        <KxdSection>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
              marginBottom: "1.25rem",
              alignItems: "center",
            }}
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={tab === t.id ? "kxd-os-btn" : "kxd-os-btn kxd-os-btn--ghost"}
                onClick={() => setTab(t.id)}
                style={{ borderRadius: 2 }}
              >
                {t.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            {mode === "edit" ? (
              <>
                <Link
                  href={`/admin/sales/proposals/${proposal?.id}/preview`}
                  className="kxd-os-btn kxd-os-btn--ghost"
                  style={{ borderRadius: 2 }}
                >
                  Preview
                </Link>
                <a
                  href={`/api/admin/proposal-builder/${proposal?.id}/pdf`}
                  className="kxd-os-btn kxd-os-btn--ghost"
                  style={{ borderRadius: 2 }}
                >
                  PDF
                </a>
              </>
            ) : (
              <span className="kxd-os-meta">Preview unlocks after Save Draft</span>
            )}
            <button
              type="button"
              className="kxd-os-btn"
              style={{ borderRadius: 2 }}
              disabled={busy || (!editable && mode === "edit")}
              onClick={() => void saveDraft()}
            >
              {busy ? "Saving draft…" : "Save Draft"}
            </button>
          </div>
          {lastDraftSavedAt || draftEditUrl ? (
            <p className="kxd-os-meta" style={{ marginTop: "-0.5rem", marginBottom: "1rem" }}>
              {lastDraftSavedAt
                ? `Last draft save: ${new Date(lastDraftSavedAt).toLocaleString()}`
                : null}
              {draftEditUrl ? (
                <>
                  {lastDraftSavedAt ? " · " : null}
                  Edit draft:{" "}
                  <Link href={draftEditUrl} style={{ color: "inherit" }}>
                    {draftEditUrl}
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}

          {error ? (
            <p role="alert" style={{ color: "var(--kxd-os-critical, #8b2e2e)", marginBottom: "1rem" }}>
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" style={{ color: "var(--kxd-os-success, #2f6b4f)", marginBottom: "1rem" }}>
              {notice}
            </p>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 220px",
              gap: "1.5rem",
            }}
            className="proposal-builder-grid"
          >
            <div>
              {tab === "identity" ? (
                <div>
                  {mode === "create" ? (
                    <Field label="Template">
                      <select
                        style={inputStyle}
                        value={templateKind}
                        onChange={(e) => applyTemplate(e.target.value as ProposalTemplateKind | "")}
                      >
                        {TEMPLATE_OPTIONS.map((o) => (
                          <option key={o.label} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : null}
                  <Field label="Proposal title">
                    <input
                      style={inputStyle}
                      value={title}
                      disabled={!editable && mode === "edit"}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setDirty(true);
                      }}
                    />
                  </Field>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: 6,
                        }}
                      >
                        <span style={labelStyle}>Primary prospect / lead</span>
                        <button
                          type="button"
                          className="kxd-os-btn kxd-os-btn--ghost"
                          style={{ borderRadius: 2, padding: "0.35rem 0.65rem", fontSize: 12 }}
                          disabled={(!editable && mode === "edit") || prospectBusy}
                          onClick={() => {
                            setShowCreateProspect((v) => !v);
                            setProspectError(null);
                          }}
                        >
                          {showCreateProspect ? "Cancel" : "Create Prospect"}
                        </button>
                      </div>
                      <select
                        style={inputStyle}
                        value={leadId}
                        disabled={!editable && mode === "edit"}
                        aria-label="Primary prospect / lead"
                        onChange={(e) => {
                          const nextId = e.target.value ? Number(e.target.value) : "";
                          if (!nextId) {
                            setLeadId("");
                            setDirty(true);
                            return;
                          }
                          const lead = leadOptions.find((l) => Number(l.id) === nextId);
                          if (lead) {
                            selectProspectLead(
                              lead,
                              "Prospect selected — empty identity fields prefilled when available.",
                            );
                          } else {
                            setLeadId(nextId);
                            setDirty(true);
                          }
                        }}
                      >
                        <option value="">—</option>
                        {leadOptions.map((l) => (
                          <option key={l.id as number} value={l.id as number}>
                            {resolveName(l)}
                          </option>
                        ))}
                      </select>
                      {leadOptions.length === 0 ? (
                        <p className="kxd-os-meta" style={{ marginTop: 6 }}>
                          No open prospects yet. Create a prospect to attach this proposal without
                          activating a client.
                        </p>
                      ) : null}
                    </div>
                    <Field label="Existing client (optional)">
                      <select
                        style={inputStyle}
                        value={clientId}
                        disabled={!editable && mode === "edit"}
                        onChange={(e) => {
                          setClientId(e.target.value ? Number(e.target.value) : "");
                          setDirty(true);
                        }}
                      >
                        <option value="">—</option>
                        {clients.map((c) => (
                          <option key={c.id as number} value={c.id as number}>
                            {resolveName(c)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {showCreateProspect ? (
                    <div
                      style={{
                        marginBottom: "1.25rem",
                        padding: "1rem",
                        border: "1px solid var(--kxd-os-line, #e2d8c8)",
                        borderRadius: 2,
                        background: "var(--kxd-os-panel, #f3ebe0)",
                      }}
                    >
                      <p className="kxd-os-meta" style={{ marginTop: 0, marginBottom: "0.85rem" }}>
                        Creates a sales prospect / lead only — not an active client record.
                      </p>
                      {prospectError ? (
                        <p role="alert" style={{ color: "var(--kxd-os-critical, #8b2e2e)", marginBottom: "0.75rem" }}>
                          {prospectError}
                        </p>
                      ) : null}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <Field label="Organization name" htmlFor="prospect-org-name">
                          <input
                            id="prospect-org-name"
                            type="text"
                            style={inputStyle}
                            value={prospectForm.companyName}
                            onChange={(e) =>
                              setProspectForm((f) => ({ ...f, companyName: e.target.value }))
                            }
                            autoComplete="organization"
                          />
                        </Field>
                        <Field label="Primary contact name" htmlFor="prospect-contact-name">
                          <input
                            id="prospect-contact-name"
                            type="text"
                            style={inputStyle}
                            value={prospectForm.contactName}
                            onChange={(e) =>
                              setProspectForm((f) => ({ ...f, contactName: e.target.value }))
                            }
                            autoComplete="name"
                            spellCheck={false}
                          />
                        </Field>
                        <Field label="Email" htmlFor="prospect-email">
                          <input
                            id="prospect-email"
                            type="email"
                            style={inputStyle}
                            value={prospectForm.email}
                            onChange={(e) =>
                              setProspectForm((f) => ({ ...f, email: e.target.value }))
                            }
                            autoComplete="email"
                          />
                        </Field>
                        <Field label="Phone (optional)" htmlFor="prospect-phone">
                          <input
                            id="prospect-phone"
                            type="tel"
                            inputMode="tel"
                            style={inputStyle}
                            value={prospectForm.phone}
                            onChange={(e) =>
                              setProspectForm((f) => ({
                                ...f,
                                phone: formatUsPhoneInput(e.target.value),
                              }))
                            }
                            autoComplete="tel"
                          />
                        </Field>
                      </div>
                      <Field label="Website (optional)" htmlFor="prospect-website">
                        <input
                          id="prospect-website"
                          type="url"
                          style={inputStyle}
                          value={prospectForm.website}
                          onChange={(e) =>
                            setProspectForm((f) => ({ ...f, website: e.target.value }))
                          }
                          autoComplete="url"
                        />
                      </Field>
                      <Field label="Internal notes (optional — never shared)" htmlFor="prospect-notes">
                        <textarea
                          id="prospect-notes"
                          style={{ ...inputStyle, minHeight: 70 }}
                          value={prospectForm.notes}
                          onChange={(e) =>
                            setProspectForm((f) => ({ ...f, notes: e.target.value }))
                          }
                        />
                      </Field>
                      <button
                        type="button"
                        className="kxd-os-btn"
                        style={{ borderRadius: 2 }}
                        disabled={prospectBusy}
                        onClick={() => void createProspect()}
                      >
                        {prospectBusy ? "Creating…" : "Save prospect"}
                      </button>
                    </div>
                  ) : null}

                  <Field label="Organizations / brands (one per line: Name | Brand)" htmlFor="proposal-orgs">
                    <textarea
                      id="proposal-orgs"
                      style={{ ...inputStyle, minHeight: 90 }}
                      disabled={!editable && mode === "edit"}
                      value={document.organizations
                        .map((o) => (o.brand ? `${o.name} | ${o.brand}` : o.name))
                        .join("\n")}
                      onChange={(e) => {
                        // Do not trim lines/segments while typing — spaces in names are meaningful.
                        const organizations = e.target.value.split("\n").map((line, index) => {
                          const prev = document.organizations[index];
                          const pipe = line.indexOf("|");
                          const name = pipe === -1 ? line : line.slice(0, pipe);
                          const brand = pipe === -1 ? "" : line.slice(pipe + 1);
                          return {
                            id: prev?.id ?? newId("org"),
                            name,
                            brand,
                          };
                        });
                        updateDocument({ ...document, organizations });
                      }}
                    />
                    <p className="kxd-os-meta" style={{ marginTop: 6 }}>
                      Additional organizations or brands listed here stay on the proposal only —
                      they do not create client records.
                    </p>
                  </Field>
                  {(() => {
                    const existing =
                      document.contacts.find((x) => x.isPrimary) ?? document.contacts[0];
                    const patchPrimary = (patch: {
                      name?: string;
                      title?: string;
                      email?: string;
                      phone?: string;
                    }) => {
                      const contact = {
                        id: existing?.id ?? newId("contact"),
                        name: patch.name ?? existing?.name ?? "",
                        title: patch.title ?? existing?.title ?? "",
                        email: patch.email ?? existing?.email ?? "",
                        phone: patch.phone ?? existing?.phone ?? "",
                        isPrimary: true,
                        organizationId: document.organizations[0]?.id,
                      };
                      updateDocument({
                        ...document,
                        contacts: [
                          contact,
                          ...document.contacts.filter((c) => c.id !== contact.id && !c.isPrimary),
                        ],
                      });
                    };
                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <Field label="Primary contact name" htmlFor="proposal-primary-name">
                          <input
                            id="proposal-primary-name"
                            type="text"
                            style={inputStyle}
                            disabled={!editable && mode === "edit"}
                            value={existing?.name ?? ""}
                            onChange={(e) => patchPrimary({ name: e.target.value })}
                            autoComplete="name"
                            spellCheck={false}
                          />
                        </Field>
                        <Field label="Title" htmlFor="proposal-primary-title">
                          <input
                            id="proposal-primary-title"
                            type="text"
                            style={inputStyle}
                            disabled={!editable && mode === "edit"}
                            value={existing?.title ?? ""}
                            onChange={(e) => patchPrimary({ title: e.target.value })}
                            autoComplete="organization-title"
                          />
                        </Field>
                        <Field label="Email" htmlFor="proposal-primary-email">
                          <input
                            id="proposal-primary-email"
                            type="email"
                            style={inputStyle}
                            disabled={!editable && mode === "edit"}
                            value={existing?.email ?? ""}
                            onChange={(e) => patchPrimary({ email: e.target.value })}
                            autoComplete="email"
                          />
                        </Field>
                        <Field label="Phone" htmlFor="proposal-primary-phone">
                          <input
                            id="proposal-primary-phone"
                            type="tel"
                            inputMode="tel"
                            style={inputStyle}
                            disabled={!editable && mode === "edit"}
                            value={existing?.phone ?? ""}
                            onChange={(e) =>
                              patchPrimary({ phone: formatUsPhoneInput(e.target.value) })
                            }
                            autoComplete="tel"
                          />
                        </Field>
                      </div>
                    );
                  })()}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                    <Field label="Proposal date">
                      <input
                        type="date"
                        style={inputStyle}
                        value={proposalDate}
                        disabled={!editable && mode === "edit"}
                        onChange={(e) => {
                          setProposalDate(e.target.value);
                          setDirty(true);
                        }}
                      />
                    </Field>
                    <Field label="Expiration date">
                      <input
                        type="date"
                        style={inputStyle}
                        value={expiresAt}
                        disabled={!editable && mode === "edit"}
                        onChange={(e) => {
                          setExpiresAt(e.target.value);
                          setDirty(true);
                        }}
                      />
                    </Field>
                    <Field label="Internal owner">
                      <input
                        style={inputStyle}
                        value={internalOwner}
                        disabled={!editable && mode === "edit"}
                        onChange={(e) => {
                          setInternalOwner(e.target.value);
                          setDirty(true);
                        }}
                      />
                    </Field>
                  </div>
                  <Field label="Internal notes (never shared)">
                    <textarea
                      style={{ ...inputStyle, minHeight: 90 }}
                      disabled={!editable && mode === "edit"}
                      value={document.internal.internalNotes ?? ""}
                      onChange={(e) =>
                        updateDocument({
                          ...document,
                          internal: { ...document.internal, internalNotes: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="Client-facing introduction">
                    <textarea
                      style={{ ...inputStyle, minHeight: 90 }}
                      disabled={!editable && mode === "edit"}
                      value={document.executive.clientFacingIntro ?? ""}
                      onChange={(e) =>
                        updateDocument({
                          ...document,
                          executive: { ...document.executive, clientFacingIntro: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <div className="kxd-os-share-panel">
                    <p className="kxd-os-meta" style={{ marginBottom: 8 }}>
                      Proposal settings
                    </p>
                    <Field label="Optional consultation booking link" htmlFor="booking-url">
                      <input
                        id="booking-url"
                        style={inputStyle}
                        disabled={!editable && mode === "edit"}
                        placeholder="https://"
                        value={document.scheduleCallUrl ?? ""}
                        onChange={(e) =>
                          updateDocument({ ...document, scheduleCallUrl: e.target.value })
                        }
                      />
                    </Field>
                    <p className="kxd-os-meta">
                      Add a Calendly, Google Calendar, or other booking link if you want the client
                      to schedule a proposal-review call. HTTPS only. Leave blank to hide it.
                      When set, a “Schedule a call” button appears with Download PDF, Request
                      changes, and Accept proposal — it does not affect approval, sharing,
                      delivery, or acceptance.
                    </p>
                  </div>
                </div>
              ) : null}

              {tab === "executive" ? (
                <div>
                  {(
                    [
                      ["executiveSummary", "Executive summary"],
                      ["currentSituation", "Current situation"],
                      ["objectives", "Objectives"],
                      ["recommendedDirection", "Recommended direction"],
                      ["desiredOutcomes", "Desired outcomes"],
                      ["clientContext", "Client-specific context"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field key={key} label={label}>
                      <textarea
                        style={{ ...inputStyle, minHeight: 100 }}
                        disabled={!editable && mode === "edit"}
                        value={document.executive[key] ?? ""}
                        onChange={(e) =>
                          updateDocument({
                            ...document,
                            executive: { ...document.executive, [key]: e.target.value },
                          })
                        }
                      />
                    </Field>
                  ))}
                </div>
              ) : null}

              {tab === "scope" ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <p className="kxd-os-body" style={{ margin: 0 }}>
                      Independent scope groups for each organization or project.
                    </p>
                    <button
                      type="button"
                      className="kxd-os-btn kxd-os-btn--ghost"
                      style={{ borderRadius: 2 }}
                      disabled={!editable && mode === "edit"}
                      onClick={addScopeGroup}
                    >
                      Add scope group
                    </button>
                  </div>
                  {document.scopeGroups.map((group, index) => (
                    <div
                      key={group.id}
                      style={{
                        borderTop: "1px solid var(--kxd-os-line, #e2d8c8)",
                        padding: "1.25rem 0",
                      }}
                    >
                      <Field label={`Scope group ${index + 1} title`}>
                        <input
                          style={inputStyle}
                          disabled={!editable && mode === "edit"}
                          value={group.title}
                          onChange={(e) => {
                            const scopeGroups = [...document.scopeGroups];
                            scopeGroups[index] = { ...group, title: e.target.value };
                            updateDocument({ ...document, scopeGroups });
                          }}
                        />
                      </Field>
                      <Field label="Organization / brand label">
                        <input
                          style={inputStyle}
                          disabled={!editable && mode === "edit"}
                          value={group.organizationName ?? ""}
                          onChange={(e) => {
                            const scopeGroups = [...document.scopeGroups];
                            scopeGroups[index] = { ...group, organizationName: e.target.value };
                            updateDocument({ ...document, scopeGroups });
                          }}
                        />
                      </Field>
                      <Field label="Overview">
                        <textarea
                          style={{ ...inputStyle, minHeight: 80 }}
                          disabled={!editable && mode === "edit"}
                          value={group.overview ?? ""}
                          onChange={(e) => {
                            const scopeGroups = [...document.scopeGroups];
                            scopeGroups[index] = { ...group, overview: e.target.value };
                            updateDocument({ ...document, scopeGroups });
                          }}
                        />
                      </Field>
                      <Field label="Deliverables (one per line)">
                        <textarea
                          style={{ ...inputStyle, minHeight: 100 }}
                          disabled={!editable && mode === "edit"}
                          value={group.deliverables.map((d) => d.title).join("\n")}
                          onChange={(e) => {
                            const deliverables = e.target.value.split("\n").map((titleValue, i) => ({
                              id: group.deliverables[i]?.id ?? newId("del"),
                              title: titleValue,
                              sortOrder: i + 1,
                            }));
                            const scopeGroups = [...document.scopeGroups];
                            scopeGroups[index] = { ...group, deliverables };
                            updateDocument({ ...document, scopeGroups });
                          }}
                        />
                      </Field>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <Field label="Timeline">
                          <input
                            style={inputStyle}
                            disabled={!editable && mode === "edit"}
                            value={group.estimatedTimeline ?? ""}
                            onChange={(e) => {
                              const scopeGroups = [...document.scopeGroups];
                              scopeGroups[index] = { ...group, estimatedTimeline: e.target.value };
                              updateDocument({ ...document, scopeGroups });
                            }}
                          />
                        </Field>
                        <Field label="Scope type">
                          <select
                            style={inputStyle}
                            disabled={!editable && mode === "edit"}
                            value={group.inclusion}
                            onChange={(e) => {
                              const scopeGroups = [...document.scopeGroups];
                              scopeGroups[index] = {
                                ...group,
                                inclusion: e.target.value as ProposalScopeGroup["inclusion"],
                              };
                              updateDocument({ ...document, scopeGroups });
                            }}
                          >
                            <option value="included">Included</option>
                            <option value="optional">Optional</option>
                            <option value="excluded">Not included</option>
                          </select>
                        </Field>
                      </div>
                      <Field label="Exclusions">
                        <textarea
                          style={{ ...inputStyle, minHeight: 70 }}
                          disabled={!editable && mode === "edit"}
                          value={group.exclusions ?? ""}
                          onChange={(e) => {
                            const scopeGroups = [...document.scopeGroups];
                            scopeGroups[index] = { ...group, exclusions: e.target.value };
                            updateDocument({ ...document, scopeGroups });
                          }}
                        />
                      </Field>
                    </div>
                  ))}
                </div>
              ) : null}

              {tab === "pricing" ? (
                <div>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                    <button type="button" className="kxd-os-btn kxd-os-btn--ghost" style={{ borderRadius: 2 }} disabled={!editable && mode === "edit"} onClick={() => addPricingLine()}>
                      Add one-time line
                    </button>
                    <button type="button" className="kxd-os-btn kxd-os-btn--ghost" style={{ borderRadius: 2 }} disabled={!editable && mode === "edit"} onClick={() => addPricingLine({ cadence: "monthly", title: "Monthly service" })}>
                      Add monthly line
                    </button>
                    <button
                      type="button"
                      className="kxd-os-btn kxd-os-btn--ghost"
                      style={{ borderRadius: 2 }}
                      disabled={!editable && mode === "edit"}
                      onClick={() =>
                        updateDocument({
                          ...document,
                          credits: [
                            ...document.credits,
                            {
                              id: newId("credit"),
                              kind: "sponsorship",
                              label: "Sponsorship / trade credit",
                              amountCents: 0,
                              appliesTo: "one-time",
                            },
                          ],
                        })
                      }
                    >
                      Add credit
                    </button>
                  </div>
                  {document.pricingLines.map((line, index) => (
                    <div
                      key={line.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 0.7fr 1fr 1fr",
                        gap: "0.5rem",
                        marginBottom: "0.65rem",
                        alignItems: "end",
                      }}
                    >
                      <Field label="Item">
                        <input
                          style={inputStyle}
                          disabled={!editable && mode === "edit"}
                          value={line.title}
                          onChange={(e) => {
                            const pricingLines = [...document.pricingLines];
                            pricingLines[index] = { ...line, title: e.target.value };
                            updateDocument({ ...document, pricingLines });
                          }}
                        />
                      </Field>
                      <Field label="Billing">
                        <select
                          style={inputStyle}
                          disabled={!editable && mode === "edit"}
                          value={line.cadence}
                          onChange={(e) => {
                            const pricingLines = [...document.pricingLines];
                            pricingLines[index] = {
                              ...line,
                              cadence: e.target.value as ProposalPricingLine["cadence"],
                            };
                            updateDocument({ ...document, pricingLines });
                          }}
                        >
                          <option value="one-time">One-time</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="annual">Annual</option>
                        </select>
                      </Field>
                      <Field label="Quantity">
                        <input
                          type="text"
                          inputMode="decimal"
                          style={inputStyle}
                          disabled={!editable && mode === "edit"}
                          value={String(line.quantity)}
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            const quantity = raw === "" ? 1 : Number(raw);
                            const pricingLines = [...document.pricingLines];
                            pricingLines[index] = {
                              ...line,
                              quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
                            };
                            updateDocument({ ...document, pricingLines });
                          }}
                        />
                      </Field>
                      <Field label="Price">
                        <ProposalCurrencyInput
                          cents={line.unitPriceCents}
                          disabled={!editable && mode === "edit"}
                          aria-label={`Price for ${line.title || "line"}`}
                          onCentsChange={(unitPriceCents) => {
                            const pricingLines = [...document.pricingLines];
                            pricingLines[index] = { ...line, unitPriceCents };
                            updateDocument({ ...document, pricingLines });
                          }}
                        />
                      </Field>
                      <Field label="Pricing Type">
                        <select
                          style={inputStyle}
                          disabled={!editable && mode === "edit"}
                          value={line.inclusion}
                          onChange={(e) => {
                            const pricingLines = [...document.pricingLines];
                            pricingLines[index] = {
                              ...line,
                              inclusion: e.target.value as ProposalPricingLine["inclusion"],
                              isAddon: e.target.value === "optional",
                            };
                            updateDocument({ ...document, pricingLines });
                          }}
                        >
                          <option value="included">Included</option>
                          <option value="optional">Optional</option>
                          <option value="excluded">Not included</option>
                        </select>
                      </Field>
                    </div>
                  ))}

                  {document.credits.map((credit, index) => (
                    <div
                      key={credit.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1fr",
                        gap: "0.5rem",
                        marginTop: "0.75rem",
                      }}
                    >
                      <Field label="Credit / adjustment">
                        <input
                          style={inputStyle}
                          disabled={!editable && mode === "edit"}
                          value={credit.label}
                          onChange={(e) => {
                            const credits = [...document.credits];
                            credits[index] = { ...credit, label: e.target.value };
                            updateDocument({ ...document, credits });
                          }}
                        />
                      </Field>
                      <Field label="Credit type">
                        <select
                          style={inputStyle}
                          disabled={!editable && mode === "edit"}
                          value={credit.kind}
                          onChange={(e) => {
                            const credits = [...document.credits];
                            credits[index] = {
                              ...credit,
                              kind: e.target.value as typeof credit.kind,
                            };
                            updateDocument({ ...document, credits });
                          }}
                        >
                          <option value="sponsorship">Sponsorship</option>
                          <option value="trade-barter">Trade / barter</option>
                          <option value="promotional">Promotional</option>
                          <option value="discount">Discount</option>
                          <option value="custom">Custom</option>
                        </select>
                      </Field>
                      <Field label="Applies to">
                        <select
                          style={inputStyle}
                          disabled={!editable && mode === "edit"}
                          value={credit.appliesTo}
                          onChange={(e) => {
                            const credits = [...document.credits];
                            credits[index] = {
                              ...credit,
                              appliesTo: e.target.value as typeof credit.appliesTo,
                            };
                            updateDocument({ ...document, credits });
                          }}
                        >
                          <option value="one-time">One-time price</option>
                          <option value="monthly">Monthly price</option>
                          <option value="annual">Annual price</option>
                          <option value="all">All pricing</option>
                        </select>
                      </Field>
                      <Field label="Amount">
                        <ProposalCurrencyInput
                          cents={credit.amountCents}
                          disabled={!editable && mode === "edit"}
                          aria-label={`Amount for ${credit.label || "credit"}`}
                          onCentsChange={(amountCents) => {
                            const credits = [...document.credits];
                            credits[index] = { ...credit, amountCents };
                            updateDocument({ ...document, credits });
                          }}
                        />
                      </Field>
                    </div>
                  ))}

                  <Field label="Deposit">
                    <ProposalCurrencyInput
                      cents={document.depositCents}
                      disabled={!editable && mode === "edit"}
                      aria-label="Deposit"
                      onCentsChange={(depositCents) =>
                        updateDocument({ ...document, depositCents })
                      }
                    />
                  </Field>
                  <div style={{ marginBottom: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span style={labelStyle}>Payment timing</span>
                      <button
                        type="button"
                        className="kxd-os-btn kxd-os-btn--ghost"
                        style={{ borderRadius: 2, padding: "0.35rem 0.65rem", fontSize: 12 }}
                        disabled={!editable && mode === "edit"}
                        onClick={() =>
                          updateDocument({
                            ...document,
                            paymentSchedule: [
                              ...document.paymentSchedule,
                              {
                                id: newId("pay"),
                                label: "Payment",
                                due: "remaining",
                                amountCents: 0,
                                sortOrder: document.paymentSchedule.length + 1,
                              },
                            ],
                          })
                        }
                      >
                        Add payment line
                      </button>
                    </div>
                    {document.paymentSchedule.length === 0 ? (
                      <p className="kxd-os-meta" style={{ margin: 0 }}>
                        Optional — leave blank until payment timing is confirmed.
                      </p>
                    ) : null}
                    {document.paymentSchedule.map((item, index) => (
                      <div
                        key={item.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1.4fr 1fr",
                          gap: "0.5rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <Field label="Label">
                          <input
                            style={inputStyle}
                            disabled={!editable && mode === "edit"}
                            value={item.label}
                            onChange={(e) => {
                              const paymentSchedule = [...document.paymentSchedule];
                              paymentSchedule[index] = { ...item, label: e.target.value };
                              updateDocument({ ...document, paymentSchedule });
                            }}
                          />
                        </Field>
                        <Field label="When due">
                          <select
                            style={inputStyle}
                            disabled={!editable && mode === "edit"}
                            value={item.due}
                            onChange={(e) => {
                              const paymentSchedule = [...document.paymentSchedule];
                              paymentSchedule[index] = {
                                ...item,
                                due: e.target.value as typeof item.due,
                              };
                              updateDocument({ ...document, paymentSchedule });
                            }}
                          >
                            <option value="at-acceptance">At acceptance</option>
                            <option value="at-contract">At contract signing</option>
                            <option value="milestone">At milestone</option>
                            <option value="on-date">On a specific date</option>
                            <option value="remaining">Remaining balance</option>
                          </select>
                        </Field>
                        <Field label="Amount">
                          <ProposalCurrencyInput
                            cents={item.amountCents}
                            disabled={!editable && mode === "edit"}
                            aria-label={`Payment amount for ${item.label || "line"}`}
                            onCentsChange={(amountCents) => {
                              const paymentSchedule = [...document.paymentSchedule];
                              paymentSchedule[index] = { ...item, amountCents };
                              updateDocument({ ...document, paymentSchedule });
                            }}
                          />
                        </Field>
                      </div>
                    ))}
                  </div>
                  <Field label="Allow client to choose optional items before accepting">
                    <select
                      style={inputStyle}
                      disabled={!editable && mode === "edit"}
                      value={document.options.clientCanSelect ? "yes" : "no"}
                      onChange={(e) =>
                        updateDocument({
                          ...document,
                          options: {
                            ...document.options,
                            clientCanSelect: e.target.value === "yes",
                            mode: e.target.value === "yes" ? "base-plus-addons" : "recommended-package",
                          },
                        })
                      }
                    >
                      <option value="no">No — included items only</option>
                      <option value="yes">Yes — client may select optional items</option>
                    </select>
                  </Field>
                  <Field label="Internal pricing notes (never shared)">
                    <textarea
                      style={{ ...inputStyle, minHeight: 70 }}
                      disabled={!editable && mode === "edit"}
                      value={document.internal.marginNotes ?? ""}
                      onChange={(e) =>
                        updateDocument({
                          ...document,
                          internal: { ...document.internal, marginNotes: e.target.value },
                        })
                      }
                    />
                  </Field>
                </div>
              ) : null}

              {tab === "terms" ? (
                <div>
                  {(
                    [
                      ["proposalTerms", "Proposal-specific terms"],
                      ["paymentAssumptions", "Payment assumptions"],
                      ["timelineAssumptions", "Timeline assumptions"],
                      ["expirationLanguage", "Expiration language"],
                      ["changeRequestLanguage", "Change-request language"],
                      ["intellectualPropertySummary", "Intellectual property summary"],
                      ["cancellationSummary", "Cancellation summary"],
                      ["clientResponsibilities", "Client responsibilities"],
                      ["exclusions", "Exclusions"],
                      ["nextSteps", "Next steps"],
                      ["closingNote", "Closing note"],
                      ["acceptanceDisclosure", "Acceptance disclosure"],
                      ["contractRequiredDisclosure", "Contract required disclosure"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field key={key} label={label}>
                      <textarea
                        style={{ ...inputStyle, minHeight: 80 }}
                        disabled={!editable && mode === "edit"}
                        value={document.terms[key] ?? ""}
                        onChange={(e) =>
                          updateDocument({
                            ...document,
                            terms: { ...document.terms, [key]: e.target.value },
                          })
                        }
                      />
                    </Field>
                  ))}
                  <p className="kxd-os-meta">
                    Operational wording only. Not attorney-approved legal contract language.
                  </p>
                </div>
              ) : null}

              {tab === "share" ? (
                <div>
                  {shareState?.liveDealProtected ? (
                    <div className="kxd-os-share-locked">
                      <p className="kxd-os-share-locked__eyebrow">Proposal delivery</p>
                      <dl className="kxd-os-share-locked__rows">
                        <div className="kxd-os-share-locked__row">
                          <dt>Status</dt>
                          <dd>
                            {status
                              .split("-")
                              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                              .join(" ")}
                          </dd>
                        </div>
                        <div className="kxd-os-share-locked__row">
                          <dt>Secure link</dt>
                          <dd>{shareState.hasActiveShareLink ? "Active" : "None on file"}</dd>
                        </div>
                        <div className="kxd-os-share-locked__row">
                          <dt>Protection</dt>
                          <dd>Locked</dd>
                        </div>
                      </dl>
                      <p className="kxd-os-share-locked__copy">
                        This live proposal is protected. Its secure client link remains active, and
                        delivery controls are locked to prevent accidental replacement or
                        invalidation.
                      </p>
                      {shareState.manualDelivery ? (
                        <dl className="kxd-os-share-locked__rows kxd-os-share-locked__rows--delivery">
                          <div className="kxd-os-share-locked__row">
                            <dt>Delivery method</dt>
                            <dd>
                              {DELIVERY_METHODS.find(
                                (method) => method.value === shareState.manualDelivery?.method,
                              )?.label ?? shareState.manualDelivery.method}
                            </dd>
                          </div>
                          <div className="kxd-os-share-locked__row">
                            <dt>Delivered</dt>
                            <dd>{fmtDate(shareState.manualDelivery.deliveredAt)}</dd>
                          </div>
                          {shareState.manualDelivery.recipient ? (
                            <div className="kxd-os-share-locked__row">
                              <dt>Recipient</dt>
                              <dd>{shareState.manualDelivery.recipient}</dd>
                            </div>
                          ) : null}
                          {shareState.manualDelivery.note ? (
                            <div className="kxd-os-share-locked__row">
                              <dt>Operator note</dt>
                              <dd>{shareState.manualDelivery.note}</dd>
                            </div>
                          ) : null}
                        </dl>
                      ) : null}
                      {proposal?.id ? (
                        <div className="kxd-os-share-actions kxd-os-share-actions--compact">
                          <a
                            className="kxd-os-btn kxd-os-btn--secondary"
                            style={{ borderRadius: 2 }}
                            href={`/api/admin/proposal-builder/${proposal.id}/pdf`}
                          >
                            Download PDF
                          </a>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <p className="kxd-os-body" style={{ marginBottom: 6 }}>
                        Approve the proposal, prepare its secure link, deliver it manually, then
                        record it as sent.
                      </p>
                      <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
                        Preparing a link does not email the client or mark the proposal as
                        delivered.
                      </p>
                      <div className="kxd-os-share-actions">
                        <button
                          type="button"
                          className="kxd-os-btn"
                          style={{ borderRadius: 2 }}
                          disabled={busy || mode !== "edit"}
                          onClick={() => void approveForSharing()}
                        >
                          Approve for Sharing
                        </button>
                        <button
                          type="button"
                          className="kxd-os-btn"
                          style={{ borderRadius: 2 }}
                          disabled={busy || mode !== "edit"}
                          onClick={() => void prepareShareLink()}
                        >
                          Prepare Share Link
                        </button>
                        {proposal?.id ? (
                          <a
                            className="kxd-os-btn kxd-os-btn--secondary"
                            style={{ borderRadius: 2 }}
                            href={`/api/admin/proposal-builder/${proposal.id}/pdf`}
                          >
                            Download PDF
                          </a>
                        ) : null}
                      </div>
                      {shareUrl ? (
                        <div className="kxd-os-share-panel">
                          <p className="kxd-os-meta" style={{ marginBottom: 8 }}>
                            Public proposal URL — shown while this session still has it. Copying or
                            opening does not rotate the token.
                          </p>
                          <a
                            className="kxd-os-share-link"
                            href={shareUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {shareUrl}
                          </a>
                          <div className="kxd-os-share-actions">
                            <button
                              type="button"
                              className="kxd-os-btn kxd-os-btn--primary"
                              style={{ borderRadius: 2 }}
                              onClick={() => void copyShareLink()}
                            >
                              Copy Link
                            </button>
                            <a
                              className="kxd-os-btn"
                              style={{ borderRadius: 2 }}
                              href={shareUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open Proposal
                            </a>
                          </div>
                          {copyStatus ? (
                            <p role="status" className="kxd-os-meta">
                              {copyStatus}
                            </p>
                          ) : null}
                        </div>
                      ) : shareState?.hasActiveShareLink ? (
                        <div className="kxd-os-share-panel">
                          <p className="kxd-os-body">
                            A secure share link is already active. The original URL cannot be
                            recovered from storage. If you still have it, use that copy. Otherwise
                            replace the link — that immediately invalidates the previous client URL.
                          </p>
                        </div>
                      ) : null}
                      {shareState?.hasActiveShareLink ? (
                        <div className="kxd-os-share-panel">
                          <p className="kxd-os-body" style={{ marginBottom: 8 }}>
                            Replace Share Link invalidates the previous client URL immediately. It
                            does not email anyone or mark the proposal as sent.
                          </p>
                          <label
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "flex-start",
                              marginBottom: 12,
                              fontFamily: "system-ui, sans-serif",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={replaceAcknowledged}
                              onChange={(e) => setReplaceAcknowledged(e.target.checked)}
                            />
                            <span>
                              I understand replacing the link will invalidate the previous client
                              URL.
                            </span>
                          </label>
                          <button
                            type="button"
                            className="kxd-os-btn kxd-os-btn--danger"
                            style={{ borderRadius: 2 }}
                            disabled={busy || !replaceAcknowledged}
                            onClick={() => void replaceShareLink()}
                          >
                            Replace Share Link
                          </button>
                        </div>
                      ) : null}
                      <div className="kxd-os-share-panel">
                        <p className="kxd-os-meta" style={{ marginBottom: 8 }}>
                          Mark as Sent — after you personally deliver the link
                        </p>
                        <p className="kxd-os-body" style={{ marginBottom: 12 }}>
                          Records that you delivered the proposal. Does not send email and does not
                          rotate the link.
                        </p>
                        <Field label="Delivery method">
                          <select
                            style={inputStyle}
                            value={deliveryMethod}
                            onChange={(e) =>
                              setDeliveryMethod(
                                e.target.value as (typeof DELIVERY_METHODS)[number]["value"],
                              )
                            }
                          >
                            {DELIVERY_METHODS.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Delivered date">
                          <input
                            type="date"
                            style={inputStyle}
                            value={deliveryAt}
                            onChange={(e) => setDeliveryAt(e.target.value)}
                          />
                        </Field>
                        <Field label="Recipient (optional)">
                          <input
                            style={inputStyle}
                            value={deliveryRecipient}
                            onChange={(e) => setDeliveryRecipient(e.target.value)}
                          />
                        </Field>
                        <Field label="Operator note (optional)">
                          <textarea
                            style={{ ...inputStyle, minHeight: 72 }}
                            value={deliveryNote}
                            onChange={(e) => setDeliveryNote(e.target.value)}
                          />
                        </Field>
                        <button
                          type="button"
                          className="kxd-os-btn"
                          style={{ borderRadius: 2 }}
                          disabled={busy || mode !== "edit"}
                          onClick={() => void markAsSent()}
                        >
                          Mark as Sent
                        </button>
                      </div>
                      <p className="kxd-os-meta">
                        Status: {status}
                        {shareState?.shareApprovedAt
                          ? ` · Approved for sharing: ${fmtDate(shareState.shareApprovedAt)}`
                          : ""}
                        {" · "}
                        Last viewed:{" "}
                        {fmtDate((proposal?.lastViewedAt ?? shareState?.lastViewedAt) as string)}
                        {" · "}
                        Marked sent: {fmtDate((shareState?.sentAt ?? proposal?.sentAt) as string)}
                        {" · "}
                        Accepted: {fmtDate(proposal?.acceptedAt as string)}
                        {" · "}
                        Change requests:{" "}
                        {Array.isArray(proposal?.changeRequests)
                          ? proposal.changeRequests.length
                          : 0}
                      </p>
                      {shareState?.manualDelivery ? (
                        <p className="kxd-os-meta">
                          Delivery method: {shareState.manualDelivery.method}
                          {shareState.manualDelivery.recipient
                            ? ` · ${shareState.manualDelivery.recipient}`
                            : ""}
                        </p>
                      ) : null}
                    </>
                  )}
                  {Array.isArray(proposal?.changeRequests) && proposal.changeRequests.length > 0 ? (
                    <div style={{ marginTop: "1rem" }}>
                      {proposal.changeRequests.map((req: SalesUiDoc) => (
                        <div key={String(req.id)} style={{ marginBottom: "0.75rem" }}>
                          <p className="kxd-os-meta">
                            {String(req.name)} · {String(req.email)} ·{" "}
                            {fmtDate(req.submittedAt as string)}
                          </p>
                          <p className="kxd-os-body">{String(req.message)}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {tab === "contract" ? (
                <div>
                  {!contract ? (
                    <p className="kxd-os-body">
                      No contract draft yet. A draft is generated automatically after proposal
                      acceptance — never emailed or sent for signature until you approve it.
                    </p>
                  ) : (
                    <>
                      <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
                        Status: {String(contract.status)} · Draft for internal review — not
                        attorney-approved.
                      </p>
                      <Field label="Contract body">
                        <textarea
                          style={{ ...inputStyle, minHeight: 320, fontFamily: "ui-monospace, monospace" }}
                          value={contractBody}
                          onChange={(e) => setContractBody(e.target.value)}
                        />
                      </Field>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button type="button" className="kxd-os-btn" style={{ borderRadius: 2 }} disabled={busy} onClick={() => void saveContract()}>
                          Save draft
                        </button>
                        <button type="button" className="kxd-os-btn kxd-os-btn--ghost" style={{ borderRadius: 2 }} disabled={busy} onClick={() => void transitionContractStatus("internal-review")}>
                          Mark internal review
                        </button>
                        <button type="button" className="kxd-os-btn kxd-os-btn--ghost" style={{ borderRadius: 2 }} disabled={busy} onClick={() => void transitionContractStatus("approved-for-signature")}>
                          Approve for signature
                        </button>
                        <button type="button" className="kxd-os-btn kxd-os-btn--ghost" style={{ borderRadius: 2 }} disabled={busy} onClick={() => void transitionContractStatus("sent-for-signature")}>
                          Mark sent for signature
                        </button>
                      </div>
                      <p className="kxd-os-meta" style={{ marginTop: "1rem" }}>
                        Production e-signature provider integration is intentionally deferred. Do not
                        treat typed names alone as a fully executed contract until the signature
                        foundation is completed.
                      </p>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <aside
              style={{
                borderLeft: "1px solid var(--kxd-os-line, #e2d8c8)",
                paddingLeft: "1.25rem",
                position: "sticky",
                top: 24,
                alignSelf: "start",
              }}
            >
              <p style={labelStyle}>Price summary</p>
              <p className="kxd-os-body" style={{ marginBottom: "0.5rem" }}>
                {orgsLabel}
              </p>
              <p className="kxd-os-meta">One-time price</p>
              <p className="kxd-os-card__title" style={{ marginBottom: "0.75rem" }}>
                {formatCents(totals.oneTimeTotalCents)}
              </p>
              <p className="kxd-os-meta">Monthly price</p>
              <p className="kxd-os-card__title" style={{ marginBottom: "0.75rem" }}>
                {formatCents(totals.monthlyTotalCents)}
              </p>
              {totals.quarterlyTotalCents > 0 ? (
                <>
                  <p className="kxd-os-meta">Quarterly price</p>
                  <p className="kxd-os-card__title" style={{ marginBottom: "0.75rem" }}>
                    {formatCents(totals.quarterlyTotalCents)}
                  </p>
                </>
              ) : null}
              {totals.annualTotalCents > 0 ? (
                <>
                  <p className="kxd-os-meta">Annual price</p>
                  <p className="kxd-os-card__title" style={{ marginBottom: "0.75rem" }}>
                    {formatCents(totals.annualTotalCents)}
                  </p>
                </>
              ) : null}
              <p className="kxd-os-meta">Credits & adjustments</p>
              <p className="kxd-os-body" style={{ marginBottom: "0.75rem" }}>
                One-time −{formatCents(totals.creditOneTimeCents + totals.discountOneTimeCents)}
                {totals.creditMonthlyCents
                  ? ` · Monthly −${formatCents(totals.creditMonthlyCents)}`
                  : ""}
              </p>
              {dirty ? (
                <p className="kxd-os-meta" style={{ marginTop: "1rem" }}>
                  Unsaved changes — use Save Draft
                </p>
              ) : null}
            </aside>
          </div>
        </KxdSection>
      </KxdPage>
      <style>{`
        @media (max-width: 900px) {
          .proposal-builder-grid {
            grid-template-columns: 1fr !important;
          }
          .proposal-builder-grid > aside {
            border-left: 0 !important;
            border-top: 1px solid var(--kxd-os-line, #e2d8c8);
            padding-left: 0 !important;
            padding-top: 1rem;
            position: static !important;
          }
        }
      `}</style>
    </OperationsShell>
  );
}
