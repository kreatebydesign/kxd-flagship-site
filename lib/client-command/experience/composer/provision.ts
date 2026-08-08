/**
 * Explicit operator provisioning for experience dependencies.
 * Writes only the owning system. Never activates CES. Never invites.
 */

import "server-only";

import path from "node:path";
import { getPayload } from "payload";
import config from "@payload-config";
import { normalizeGa4PropertyId } from "@/lib/reporting/providers/connection-resolve";
import { resolveMediaAssetUrl } from "../media-url";
import { discoverExperienceDependencies } from "./discover";
import { findImportableGa4Property, findImportableGscSite } from "./discover/google-match";
import { isManagedSiteAsset, resolveManagedSiteUrl } from "./discover/html";
import { prepareManagedLogoUpload } from "./import-logo";
import { isKxdGoldHex, isTrustedClientAccent } from "./readiness";
import { loadExperienceSignals } from "./signals";
import type { ExperienceProvisionActionId } from "./types";
import {
  isDurablePayloadMediaUrl,
  requireDurablePayloadMedia,
} from "@/lib/media/payload-storage";

export type ExperienceProvisionInput = {
  actionId: ExperienceProvisionActionId;
  candidateValue?: string | null;
};

export type ExperienceProvisionResult = {
  ok: boolean;
  message: string;
  actionId: ExperienceProvisionActionId;
  mutatesProfile: false;
  invites: false;
};

function fail(
  actionId: ExperienceProvisionActionId,
  message: string,
): ExperienceProvisionResult {
  return { ok: false, message, actionId, mutatesProfile: false, invites: false };
}

function ok(actionId: ExperienceProvisionActionId, message: string): ExperienceProvisionResult {
  return { ok: true, message, actionId, mutatesProfile: false, invites: false };
}

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

async function downloadManagedAsset(
  url: string,
): Promise<{ ok: true; buffer: Buffer; mime: string; filename: string } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
      headers: { "User-Agent": "KXD-OS-ExperienceImport/1.0" },
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > 2_000_000) return { ok: false, error: "Asset exceeded 2MB." };
    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || guessMime(url);
    if (!mime.startsWith("image/")) return { ok: false, error: `Not an image (${mime}).` };
    const filename = path.basename(new URL(url).pathname) || "client-logo";
    return { ok: true, buffer, mime, filename };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, error: err instanceof Error ? err.message : "Download failed" };
  }
}

function guessMime(url: string): string {
  if (/\.svg(\?|$)/i.test(url)) return "image/svg+xml";
  if (/\.png(\?|$)/i.test(url)) return "image/png";
  if (/\.jpe?g(\?|$)/i.test(url)) return "image/jpeg";
  if (/\.webp(\?|$)/i.test(url)) return "image/webp";
  return "application/octet-stream";
}

export async function applyExperienceProvision(
  clientId: number,
  input: ExperienceProvisionInput,
): Promise<ExperienceProvisionResult> {
  const actionId = input.actionId;
  const signals = await loadExperienceSignals(clientId);
  if (!signals) return fail(actionId, "Client not found.");

  const payload = await getPayload({ config });

  if (actionId === "apply-search-console-site-url") {
    const discovery = await discoverExperienceDependencies(clientId, "search-console");
    if (!discovery.ok) return fail(actionId, discovery.message);
    const match = findImportableGscSite(discovery.searchConsole?.candidates ?? [], input.candidateValue);
    if (!match) {
      return fail(
        actionId,
        "Search Console import requires a verified property listed for this client by the connected Google account. A proposed sc-domain identifier is not enough.",
      );
    }
    if (signals.searchConsoleSiteUrl) {
      return ok(actionId, "Search Console site URL is already stored on infrastructure.");
    }
    if (!signals.infrastructureId) {
      return fail(actionId, "Create a Client Infrastructure record before applying Search Console.");
    }
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      id: signals.infrastructureId,
      data: { searchConsoleSiteUrl: match.siteUrl },
      overrideAccess: true,
    });
    return ok(
      actionId,
      `Stored verified Search Console property ${match.siteUrl} on Client Infrastructure. Reporting ingest still requires ongoing Google access.`,
    );
  }

  if (actionId === "apply-discovered-ga4-property") {
    const requested = input.candidateValue?.trim() || signals.discoveredGa4PropertyId;
    if (requested && /^G-/i.test(requested)) {
      return fail(actionId, "A GA4 measurement ID cannot be stored as the numeric property ID.");
    }
    const propertyId = normalizeGa4PropertyId(requested);
    if (!propertyId) {
      return fail(actionId, "No numeric GA4 property ID was provided.");
    }

    const fromFacts = signals.discoveredGa4PropertyId === propertyId;
    if (!fromFacts) {
      const discovery = await discoverExperienceDependencies(clientId, "ga4");
      if (!discovery.ok) return fail(actionId, discovery.message);
      const match = findImportableGa4Property(discovery.ga4?.candidates ?? [], propertyId);
      if (!match) {
        return fail(
          actionId,
          "That GA4 property is not an importable match for this client's managed website.",
        );
      }
    }

    if (signals.ga4PropertyId) {
      return ok(actionId, "GA4 property ID is already stored on infrastructure.");
    }
    if (!signals.infrastructureId) {
      return fail(actionId, "Create a Client Infrastructure record before applying GA4.");
    }
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      id: signals.infrastructureId,
      data: { ga4PropertyId: propertyId },
      overrideAccess: true,
    });
    return ok(
      actionId,
      `Stored GA4 property ${propertyId} on Client Infrastructure. Viewer access and ingest still required.`,
    );
  }

  if (actionId === "import-branding-logo") {
    const candidateUrl = input.candidateValue?.trim();
    if (!candidateUrl) return fail(actionId, "Select a discovered logo to import.");
    if (!isManagedSiteAsset(candidateUrl, signals.websiteUrl, signals.primaryDomain)) {
      return fail(
        actionId,
        "That logo is not on this client's known managed website / domain, so it cannot be imported.",
      );
    }
    const storageReady = requireDurablePayloadMedia();
    if (!storageReady.ok) return fail(actionId, storageReady.error);

    const downloaded = await downloadManagedAsset(candidateUrl);
    if (!downloaded.ok) return fail(actionId, `Could not copy logo: ${downloaded.error}`);
    const prepared = await prepareManagedLogoUpload(downloaded);
    if (!prepared.ok) return fail(actionId, prepared.error);

    let mediaId: number | null = null;
    let previousLogoFiles: number[] | null = null;
    let existingOnboardingId: number | null = null;
    let createdOnboardingId: number | null = null;

    const rollbackLogoImport = async () => {
      if (mediaId != null) {
        try {
          await payload.delete({ collection: "media", id: mediaId, overrideAccess: true });
        } catch {
          /* best-effort rollback */
        }
      }
      if (createdOnboardingId != null) {
        try {
          await payload.delete({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            collection: "client-onboarding" as any,
            id: createdOnboardingId,
            overrideAccess: true,
          });
        } catch {
          /* best-effort rollback */
        }
      } else if (existingOnboardingId != null && previousLogoFiles != null) {
        try {
          await payload.update({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            collection: "client-onboarding" as any,
            id: existingOnboardingId,
            data: { logoFiles: previousLogoFiles },
            overrideAccess: true,
          });
        } catch {
          /* best-effort rollback */
        }
      }
    };

    try {
      const created = await payload.create({
        collection: "media",
        data: {
          alt: `${signals.clientName} logo`,
          caption: `Imported from ${candidateUrl}${prepared.file.rasterizedFromSvg ? " (SVG stored as PNG for CES media)" : ""}`,
        },
        file: {
          data: prepared.file.buffer,
          mimetype: prepared.file.mime,
          name: prepared.file.filename,
          size: prepared.file.buffer.byteLength,
        },
        overrideAccess: true,
      });
      mediaId = Number(created.id);
      if (!Number.isFinite(mediaId)) {
        return fail(actionId, "Media record was created without an id.");
      }
      const createdUrl = resolveMediaAssetUrl(created);
      if (!isDurablePayloadMediaUrl(createdUrl)) {
        await rollbackLogoImport();
        return fail(
          actionId,
          "Media record was created without a durable file URL. Nothing was attached to onboarding.",
        );
      }

      const existing = await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-onboarding" as any,
        where: { client: { equals: clientId } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      const onboarding = existing.docs[0] as { id?: number; logoFiles?: unknown[] } | undefined;
      const existingIds = Array.isArray(onboarding?.logoFiles)
        ? onboarding!.logoFiles.map(relId).filter((id): id is number => id != null)
        : [];
      const logoFiles = [mediaId, ...existingIds.filter((id) => id !== mediaId)];

      if (onboarding?.id != null) {
        existingOnboardingId = Number(onboarding.id);
        previousLogoFiles = existingIds;
        await payload.update({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "client-onboarding" as any,
          id: onboarding.id,
          data: { logoFiles },
          overrideAccess: true,
        });
      } else {
        const createdOnboarding = await payload.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "client-onboarding" as any,
          data: {
            client: clientId,
            businessName: signals.clientName,
            status: "draft",
            currentWebsite: signals.websiteUrl,
            logoFiles,
          },
          overrideAccess: true,
        });
        createdOnboardingId = Number((createdOnboarding as { id?: number }).id);
      }

      const verify = await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-onboarding" as any,
        where: { client: { equals: clientId } },
        limit: 1,
        depth: 1,
        overrideAccess: true,
      });
      const stored = (verify.docs[0] as { logoFiles?: unknown[] } | undefined)?.logoFiles?.[0];
      const resolved = resolveMediaAssetUrl(stored);
      if (!isDurablePayloadMediaUrl(resolved)) {
        await rollbackLogoImport();
        return fail(
          actionId,
          "Logo media was created but Client Onboarding did not persist a durable logo file. Import was rolled back.",
        );
      }
    } catch (err) {
      await rollbackLogoImport();
      const message = err instanceof Error ? err.message : "Media create failed";
      return fail(actionId, `Could not store the logo in Media. ${message}`);
    }

    const origin = resolveManagedSiteUrl(signals.websiteUrl, signals.primaryDomain);
    return ok(
      actionId,
      `${signals.clientName} logo imported into Client Onboarding from ${origin || "the managed website"}.`,
    );
  }

  if (actionId === "import-branding-colors") {
    let parsed: { primary?: string; secondary?: string; accent?: string };
    try {
      parsed = JSON.parse(input.candidateValue || "{}") as {
        primary?: string;
        secondary?: string;
        accent?: string;
      };
    } catch {
      return fail(actionId, "Color import requires an explicit primary/secondary/accent selection.");
    }
    const discovery = await discoverExperienceDependencies(clientId, "branding");
    if (!discovery.ok) return fail(actionId, discovery.message);
    const allowed = new Set(
      (discovery.branding?.colors ?? []).map((color) => color.hex.toUpperCase()),
    );
    const primary = parsed.primary?.trim().toUpperCase() ?? "";
    const secondary = parsed.secondary?.trim().toUpperCase() ?? "";
    const accent = parsed.accent?.trim().toUpperCase() ?? "";
    for (const hex of [primary, secondary, accent]) {
      if (!hex) return fail(actionId, "Select primary, secondary, and accent colors from discovered candidates.");
      if (isKxdGoldHex(hex) || hex === "#C9A962") {
        return fail(actionId, "KXD gold cannot be imported as client branding.");
      }
      if (!isTrustedClientAccent(hex) || !allowed.has(hex)) {
        return fail(actionId, `Color ${hex} is not a discovered candidate for this client.`);
      }
    }

    const slugBase = (signals.clientSlug || `client-${clientId}`)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-");
    const slug = `${slugBase}-brand-kit`;
    if (signals.brandKit) {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "brand-kits" as any,
        id: signals.brandKit.id,
        data: { primaryColor: primary, secondaryColor: secondary, accentColor: accent },
        overrideAccess: true,
      });
    } else {
      await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "brand-kits" as any,
        data: {
          brandName: signals.clientName,
          slug,
          client: clientId,
          status: "draft",
          primaryColor: primary,
          secondaryColor: secondary,
          accentColor: accent,
        },
        overrideAccess: true,
      });
    }
    return ok(
      actionId,
      "Imported approved colors into the Brand Kit. CES will use them as the authoritative client palette.",
    );
  }

  return fail(actionId, "Unknown provisioning action.");
}
