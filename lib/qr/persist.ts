/**
 * QR record persistence — metadata only.
 * PNG/SVG are regenerated from destinationUrl + settings on demand.
 */

import type { Payload } from "payload";
import {
  QR_COLLECTION_SLUG,
  QR_DEFAULT_SETTINGS,
  type QrErrorCorrectionLevel,
  type QrRecordInput,
  type QrRecordSummary,
} from "./types";

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  if (value && typeof value === "object" && "id" in value) {
    return asNumber((value as { id: unknown }).id);
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text || null;
}

function mapDoc(doc: Record<string, unknown>): QrRecordSummary | null {
  const id = asNumber(doc.id);
  const destinationUrl = asString(doc.destinationUrl);
  if (id == null || !destinationUrl) return null;

  const clientField = doc.client;
  let clientId: number | null = null;
  let clientName: string | null = null;
  if (clientField && typeof clientField === "object") {
    clientId = asNumber((clientField as { id?: unknown }).id);
    clientName = asString((clientField as { name?: unknown }).name);
  } else {
    clientId = asNumber(clientField);
  }

  const level = asString(doc.errorCorrectionLevel) as QrErrorCorrectionLevel | null;
  const width = asNumber(doc.width) ?? QR_DEFAULT_SETTINGS.width;

  return {
    id,
    label: asString(doc.label),
    destinationUrl,
    clientId,
    clientName,
    createdAt: asString(doc.createdAt) ?? new Date(0).toISOString(),
    updatedAt: asString(doc.updatedAt) ?? new Date(0).toISOString(),
    errorCorrectionLevel: level ?? QR_DEFAULT_SETTINGS.errorCorrectionLevel,
    width,
  };
}

export async function createQrRecord(
  payload: Payload,
  input: QrRecordInput,
): Promise<QrRecordSummary> {
  const settings = input.settings ?? QR_DEFAULT_SETTINGS;
  const label = input.label?.trim() || null;
  const clientId =
    input.clientId != null && Number.isFinite(input.clientId) && input.clientId > 0
      ? Math.trunc(input.clientId)
      : null;

  const data: Record<string, unknown> = {
    destinationUrl: input.destinationUrl,
    label,
    errorCorrectionLevel: settings.errorCorrectionLevel,
    width: settings.width,
    margin: settings.margin,
    version: "v1",
  };

  if (clientId != null) data.client = clientId;
  if (input.createdByUserId != null && input.createdByUserId > 0) {
    data.createdBy = Math.trunc(input.createdByUserId);
  }

  const created = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- collection pending payload generate:types
    collection: QR_COLLECTION_SLUG as any,
    data: data as never,
    depth: 1,
    overrideAccess: true,
  });

  const mapped = mapDoc(created as unknown as Record<string, unknown>);
  if (!mapped) {
    throw new Error("Failed to map created QR record.");
  }
  return mapped;
}

export async function listRecentQrRecords(
  payload: Payload,
  options?: { limit?: number; clientId?: number | null },
): Promise<QrRecordSummary[]> {
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
  const where =
    options?.clientId != null && options.clientId > 0
      ? { client: { equals: options.clientId } }
      : undefined;

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- collection pending payload generate:types
    collection: QR_COLLECTION_SLUG as any,
    where,
    limit,
    depth: 1,
    sort: "-createdAt",
    overrideAccess: true,
  });

  return (result.docs as unknown as Record<string, unknown>[])
    .map(mapDoc)
    .filter((row): row is QrRecordSummary => row != null);
}

export async function getQrRecordById(
  payload: Payload,
  id: number,
): Promise<QrRecordSummary | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- collection pending payload generate:types
      collection: QR_COLLECTION_SLUG as any,
      id,
      depth: 1,
      overrideAccess: true,
    });
    return mapDoc(doc as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}
