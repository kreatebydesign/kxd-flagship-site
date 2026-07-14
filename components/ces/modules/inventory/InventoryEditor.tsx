"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import type {
  InventoryVehicleInput,
  InventoryVehicleRecord,
  PublicInventoryVehicle,
} from "@/lib/inventory/types";
import { suggestInventorySlug } from "@/lib/inventory/slug";
import { CesHero, CesPage } from "@/components/ces/primitives";

type Props = {
  profile: ResolvedExperienceProfile;
  mode: "create" | "edit";
  initial?: InventoryVehicleRecord | null;
  initialPreview?: PublicInventoryVehicle | null;
};

type FormState = {
  title: string;
  slug: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  condition: "new" | "used";
  listingStatus: string;
  featured: boolean;
  price: string;
  priceDisplayMode: string;
  mileage: string;
  vin: string;
  stockNumber: string;
  summary: string;
  description: string;
  sortOrder: string;
  externalUrl: string;
  primaryImageId: number | null;
  primaryImageUrl: string | null;
  gallery: Array<{ id: number; url: string; alt: string }>;
  highlightsText: string;
  specsText: string;
};

function fromRecord(record?: InventoryVehicleRecord | null): FormState {
  return {
    title: record?.title ?? "",
    slug: record?.slug ?? "",
    year: record?.year != null ? String(record.year) : "",
    make: record?.make ?? "",
    model: record?.model ?? "",
    trim: record?.trim ?? "",
    condition: record?.condition ?? "used",
    listingStatus: record?.listingStatus ?? "draft",
    featured: record?.featured ?? false,
    price: record?.price != null ? String(record.price) : "",
    priceDisplayMode: record?.priceDisplayMode ?? "exact",
    mileage: record?.mileage != null ? String(record.mileage) : "",
    vin: record?.vin ?? "",
    stockNumber: record?.stockNumber ?? "",
    summary: record?.summary ?? "",
    description: record?.description ?? "",
    sortOrder: String(record?.sortOrder ?? 0),
    externalUrl: record?.externalUrl ?? "",
    primaryImageId: record?.primaryImage?.id ?? null,
    primaryImageUrl: record?.primaryImage?.url ?? null,
    gallery: record?.gallery ?? [],
    highlightsText: (record?.highlights ?? []).map((row) => row.text).join("\n"),
    specsText: (record?.specifications ?? [])
      .map((row) => `${row.label}: ${row.value}`)
      .join("\n"),
  };
}

function toPayload(form: FormState): InventoryVehicleInput {
  const specifications = form.specsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return { label: line, value: "" };
      return {
        label: line.slice(0, idx).trim(),
        value: line.slice(idx + 1).trim(),
      };
    })
    .filter((row) => row.label && row.value);

  return {
    title: form.title,
    slug: form.slug,
    year: form.year ? Number(form.year) : null,
    make: form.make,
    model: form.model,
    trim: form.trim || null,
    condition: form.condition,
    listingStatus: form.listingStatus as InventoryVehicleInput["listingStatus"],
    featured: form.featured,
    price: form.price ? Number(form.price) : null,
    priceDisplayMode:
      form.priceDisplayMode as InventoryVehicleInput["priceDisplayMode"],
    mileage: form.mileage ? Number(form.mileage) : null,
    vin: form.vin || null,
    stockNumber: form.stockNumber || null,
    summary: form.summary || null,
    description: form.description || null,
    sortOrder: Number(form.sortOrder || 0),
    externalUrl: form.externalUrl || null,
    primaryImageId: form.primaryImageId,
    galleryImageIds: form.gallery.map((image) => image.id),
    highlights: form.highlightsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    specifications,
  };
}

export function InventoryEditor({
  profile,
  mode,
  initial,
  initialPreview,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState(() => fromRecord(initial));
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [preview, setPreview] = useState(initialPreview ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const title = mode === "create" ? "Add vehicle" : form.title || "Edit vehicle";

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (
        !slugTouched &&
        (key === "year" || key === "make" || key === "model" || key === "trim" || key === "title")
      ) {
        next.slug = suggestInventorySlug({
          year: next.year ? Number(next.year) : null,
          make: next.make,
          model: next.model,
          trim: next.trim,
          title: next.title,
        });
      }
      return next;
    });
  }

  async function uploadImage(file: File, kind: "primary" | "gallery") {
    const body = new FormData();
    body.append("file", file);
    body.append("alt", form.title || file.name);
    const response = await fetch("/api/portal/inventory/upload", {
      method: "POST",
      body,
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setError(data.message || "Upload failed.");
      return;
    }
    if (kind === "primary") {
      setForm((prev) => ({
        ...prev,
        primaryImageId: data.media.id,
        primaryImageUrl: data.media.path || data.media.url,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        gallery: [
          ...prev.gallery,
          {
            id: data.media.id,
            url: data.media.path || data.media.url,
            alt: data.media.alt,
          },
        ],
      }));
    }
  }

  function save() {
    startTransition(async () => {
      setError(null);
      const payload = toPayload(form);
      const response = await fetch(
        mode === "create"
          ? "/api/portal/inventory"
          : `/api/portal/inventory/${initial?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message || "Could not save vehicle.");
        return;
      }
      setPreview(data.preview ?? null);
      if (mode === "create") {
        router.push(`/portal/inventory/${data.vehicle.id}`);
        return;
      }
      router.refresh();
    });
  }

  const previewJson = useMemo(
    () => (preview ? JSON.stringify(preview, null, 2) : "Not public in current status."),
    [preview],
  );

  return (
    <CesPage>
      <CesHero
        eyebrow={profile.terminology["inventory.landing.eyebrow"] ?? "Listings"}
        title={title}
        lead="VIN stays private. Public website listing follows availability, pending, and coming soon statuses."
        presence
        actions={
          <div className="kxd-ces-hero__action-row">
            <Link href="/portal/inventory" className="kxd-ces-btn kxd-ces-btn--ghost">
              Back to inventory
            </Link>
            <button
              type="button"
              className="kxd-ces-btn kxd-ces-btn--primary"
              onClick={save}
              disabled={pending}
            >
              {pending ? "Saving…" : "Save vehicle"}
            </button>
          </div>
        }
      />

      {error ? <p className="kxd-inv-error">{error}</p> : null}

      <section className="kxd-ces-section kxd-inv-form">
        <div className="kxd-inv-form__grid">
          <label className="kxd-inv-field kxd-inv-field--wide">
            <span>Title</span>
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </label>
          <label className="kxd-inv-field">
            <span>Slug</span>
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update("slug", e.target.value);
              }}
            />
          </label>
          <label className="kxd-inv-field">
            <span>Year</span>
            <input
              value={form.year}
              onChange={(e) => update("year", e.target.value)}
            />
          </label>
          <label className="kxd-inv-field">
            <span>Make</span>
            <input
              value={form.make}
              onChange={(e) => update("make", e.target.value)}
            />
          </label>
          <label className="kxd-inv-field">
            <span>Model</span>
            <input
              value={form.model}
              onChange={(e) => update("model", e.target.value)}
            />
          </label>
          <label className="kxd-inv-field">
            <span>Trim</span>
            <input
              value={form.trim}
              onChange={(e) => update("trim", e.target.value)}
            />
          </label>
          <label className="kxd-inv-field">
            <span>Condition</span>
            <select
              value={form.condition}
              onChange={(e) =>
                update("condition", e.target.value as "new" | "used")
              }
            >
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
          </label>
          <label className="kxd-inv-field">
            <span>Listing status</span>
            <select
              value={form.listingStatus}
              onChange={(e) => update("listingStatus", e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="available">Available</option>
              <option value="pending">Pending</option>
              <option value="coming_soon">Coming soon</option>
              <option value="sold">Sold</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
          <label className="kxd-inv-field">
            <span>Price</span>
            <input
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
            />
          </label>
          <label className="kxd-inv-field">
            <span>Price display</span>
            <select
              value={form.priceDisplayMode}
              onChange={(e) => update("priceDisplayMode", e.target.value)}
            >
              <option value="exact">Exact</option>
              <option value="contact">Contact</option>
              <option value="call">Call</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
          <label className="kxd-inv-field">
            <span>Mileage</span>
            <input
              value={form.mileage}
              onChange={(e) => update("mileage", e.target.value)}
            />
          </label>
          <label className="kxd-inv-field">
            <span>Stock number</span>
            <input
              value={form.stockNumber}
              onChange={(e) => update("stockNumber", e.target.value)}
            />
          </label>
          <label className="kxd-inv-field">
            <span>VIN (private)</span>
            <input
              value={form.vin}
              onChange={(e) => update("vin", e.target.value)}
            />
          </label>
          <label className="kxd-inv-field">
            <span>Sort order</span>
            <input
              value={form.sortOrder}
              onChange={(e) => update("sortOrder", e.target.value)}
            />
          </label>
          <label className="kxd-inv-field kxd-inv-field--wide">
            <span>Summary</span>
            <textarea
              value={form.summary}
              onChange={(e) => update("summary", e.target.value)}
              rows={3}
            />
          </label>
          <label className="kxd-inv-field kxd-inv-field--wide">
            <span>Description</span>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={6}
            />
          </label>
          <label className="kxd-inv-field kxd-inv-field--wide">
            <span>Highlights (one per line)</span>
            <textarea
              value={form.highlightsText}
              onChange={(e) => update("highlightsText", e.target.value)}
              rows={4}
            />
          </label>
          <label className="kxd-inv-field kxd-inv-field--wide">
            <span>Specifications (Label: Value)</span>
            <textarea
              value={form.specsText}
              onChange={(e) => update("specsText", e.target.value)}
              rows={4}
            />
          </label>
          <label className="kxd-inv-field kxd-inv-check">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => update("featured", e.target.checked)}
            />
            Featured
          </label>
        </div>

        <div className="kxd-inv-media">
          <div>
            <h3>Primary image</h3>
            {form.primaryImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.primaryImageUrl} alt="" className="kxd-inv-thumb" />
            ) : null}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadImage(file, "primary");
              }}
            />
          </div>
          <div>
            <h3>Gallery</h3>
            <div className="kxd-inv-gallery">
              {form.gallery.map((image) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={image.id} src={image.url} alt={image.alt} />
              ))}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadImage(file, "gallery");
              }}
            />
          </div>
        </div>
      </section>

      <section className="kxd-ces-section kxd-inv-preview">
        <h2>Public preview shape</h2>
        <p>
          This is the DTO your public website will consume. VIN is never included.
        </p>
        <pre>{previewJson}</pre>
      </section>
    </CesPage>
  );
}
