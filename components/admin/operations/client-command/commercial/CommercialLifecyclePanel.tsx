"use client";

import { useState } from "react";
import { ContractLifecycleActions } from "@/components/admin/sales/ContractLifecycleActions";
import { CommercialDisclosure } from "./CommercialDisclosure";
import { StartClientLaunchButton } from "./StartClientLaunchButton";
import { formatPaymentMethodLabel } from "@/lib/client-command/commercial/map-agreement";
import { formatCents } from "@/lib/proposal-builder/money";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";

type AuthSummary = {
  authorizedBy: string;
  method: string;
  authorizedAt: string | null;
  amountCents: number | null;
  notes: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
};

export function CommercialLifecyclePanel(props: {
  contractId: number;
  contractStatus: string;
  agreementSource: string | null;
  commercialStatus: string | null;
  hasOperatorSignature: boolean;
  hasClientSignature: boolean;
  hasExternalAcceptance: boolean;
  onboardingEligible: boolean;
  launchedClientId?: number | null;
  blockers: Array<{ code: string; message: string }>;
  defaultRecipientName: string;
  defaultRecipientEmail: string;
  documentRefs: Array<{ id: number; kind: string }>;
  externalAcceptanceSummary: string | null;
  authorizationSummary: AuthSummary | null;
  defaultLifecycleOpen?: boolean;
}) {
  const hasAuth = Boolean(props.authorizationSummary);
  const [editingAuth, setEditingAuth] = useState(!hasAuth);
  const needsAction =
    !props.hasExternalAcceptance ||
    props.commercialStatus === "draft" ||
    props.commercialStatus === "finalized" ||
    props.commercialStatus === "sent" ||
    props.commercialStatus === "accepted" ||
    props.commercialStatus === "payment-pending" ||
    props.commercialStatus === "paid";

  return (
    <div className="kxd-os-commercial-lifecycle-panel">
      <StartClientLaunchButton
        contractId={props.contractId}
        onboardingEligible={props.onboardingEligible}
        alreadyLaunchedClientId={props.launchedClientId ?? null}
      />

      {props.authorizationSummary && !editingAuth ? (
        <div className="kxd-os-commercial-panel-card">
          <div className="kxd-os-commercial-panel-card__head">
            <h3>Authorization</h3>
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
              onClick={() => setEditingAuth(true)}
            >
              Edit
            </button>
          </div>
          <dl className="kxd-os-commercial-kv">
            <div>
              <dt>Authorized by</dt>
              <dd>{props.authorizationSummary.authorizedBy}</dd>
            </div>
            <div>
              <dt>Method</dt>
              <dd>{props.authorizationSummary.method.replace(/-/g, " ")}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>
                {props.authorizationSummary.authorizedAt
                  ? fmtWorkspaceDate(props.authorizationSummary.authorizedAt)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>
                {props.authorizationSummary.amountCents != null
                  ? formatCents(props.authorizationSummary.amountCents as never)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Method on file</dt>
              <dd>
                {formatPaymentMethodLabel(
                  props.authorizationSummary.cardBrand,
                  props.authorizationSummary.cardLast4,
                )}
              </dd>
            </div>
          </dl>
          {props.authorizationSummary.notes ? (
            <p className="kxd-os-commercial-notes">{props.authorizationSummary.notes}</p>
          ) : null}
        </div>
      ) : null}

      <CommercialDisclosure
        title="Lifecycle controls"
        summary={
          needsAction
            ? "Finalize, accept, authorize, activate"
            : "Advanced operator controls"
        }
        defaultOpen={props.defaultLifecycleOpen ?? needsAction}
      >
        {hasAuth && editingAuth ? (
          <div className="kxd-os-commercial-edit-banner">
            <span>Editing authorization fields</span>
            <button
              type="button"
              className="kxd-os-link-quiet"
              onClick={() => setEditingAuth(false)}
            >
              Cancel
            </button>
          </div>
        ) : null}
        <div className="kxd-os-commercial-actions-shell">
          <ContractLifecycleActions
            contractId={props.contractId}
            contractStatus={props.contractStatus}
            agreementSource={props.agreementSource}
            commercialStatus={props.commercialStatus}
            hasOperatorSignature={props.hasOperatorSignature}
            hasClientSignature={props.hasClientSignature}
            hasExternalAcceptance={props.hasExternalAcceptance}
            onboardingEligible={props.onboardingEligible}
            blockers={props.blockers}
            defaultRecipientName={props.defaultRecipientName}
            defaultRecipientEmail={props.defaultRecipientEmail}
            documentRefs={props.documentRefs}
            externalAcceptanceSummary={props.externalAcceptanceSummary}
            suppressAcceptanceSummary
            suppressAuthorizationForm={hasAuth && !editingAuth}
          />
        </div>
      </CommercialDisclosure>
    </div>
  );
}
