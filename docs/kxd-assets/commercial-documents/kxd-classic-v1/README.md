# KXD Classic Commercial Document Standard (v1)

This folder is the **canonical KXD Classic Commercial Document Standard**.

The approved visual reference is:

`reference/KXD-Classic-Commercial-Document-Reference-Platinum-2026-10-10.pdf`

That PDF is the Platinum Film Workz Account Statement as of **2026-10-10** — the locked presentation target for KXD Classic commercial documents.

## Standard

Future **invoices**, **account statements**, **payment receipts**, and **payment schedules** must preserve:

- warm-white letter-page presentation
- KXD logo / prepared-for header composition
- black serif hierarchy with restrained gold accents
- exact document rhythm: overview, due / recorded / adjustments / position as applicable
- prominent total currently due treatment
- quiet footer
- one-page preference where content allows
- no generic software-invoice styling

Do not invent a parallel commercial document look. Extract or migrate from the modules below; keep this reference PDF as the visual source of truth.

## Current implementation source of truth

The live renderer that produces this standard today:

| Role | Path |
|------|------|
| PDF renderer (Classic letter presentation) | `lib/commercial-documents/account-statement/export-pdf.tsx` |
| Document model | `lib/commercial-documents/account-statement/types.ts` |
| Ledger → document composition | `lib/commercial-documents/account-statement/compose.ts` |
| Payment history normalization | `lib/commercial-documents/account-statement/normalize-payment-history.ts` |
| Arithmetic validation | `lib/commercial-documents/account-statement/validate.ts` |
| Public exports | `lib/commercial-documents/account-statement/index.ts` |
| Live statement builder (Commercial UI / PDF API) | `lib/client-command/commercial/build-account-statement.ts` |
| Brand logo / contact helpers used by the renderer | `lib/kxd-report-engine/` |
| Report color tokens (paper, ink, gold) | `lib/kxd-report-engine/tokens` |

Operator delivery surfaces that consume this stack:

- Commercial Statements UI — `components/admin/operations/client-command/commercial/CommercialStatements.tsx`
- Admin PDF route — `app/api/admin/clients/[clientId]/commercial/account-statement/pdf/route.ts`

Invoices, receipts, and payment schedules that adopt KXD Classic must align to this reference and, when extracted, share the same presentation foundation currently embodied by the account-statement renderer above.
