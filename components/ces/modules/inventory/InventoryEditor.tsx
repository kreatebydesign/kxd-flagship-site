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
import { PUBLIC_LISTABLE_STATUSES } from "@/lib/inventory/types";
import { suggestInventorySlug } from "@/lib/inventory/slug";
import {
  formatInventoryIdentity,
  formatInventoryPrice,
  inventoryGroupLabel,
  inventoryStatusLabel,
  inventoryStatusTone,
} from "@/lib/inventory/presentation";
import { LISTING_STATUS_LABELS } from "@/lib/inventory/constants";
import { KxdToggle } from "@/components/os";
import { CesPage } from "@/components/ces/primitives";

type Props = {
  profile: ResolvedExperienceProfile;
  mode: "create" | "edit";
  initial?: InventoryVehicleRecord | null;
  initialPreview?: PublicInventoryVehicle | null;
};

type GalleryItem = { id: number; url: string; alt: string };

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
  gallery: GalleryItem[];
  highlightsText: string;
  specsText: string;
};

const YEAR_OPTIONS = Array.from({ length: 80 }, (_, i) => String(new Date().getFullYear() + 1 - i));
const PUBLIC_SET = new Set<string>(PUBLIC_LISTABLE_STATUSES);
const DESC_LIMIT = 5000;
const LINE_LIMIT = 2000;

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

function SectionNum({ n }: { n: string }) {
  return (
    <span className="kxd-inv-num" aria-hidden>
      {n}
    </span>
  );
}

function Field({
  label,
  required,
  hint,
  wide,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`kxd-inv-field${wide ? " kxd-inv-field--wide" : ""}`}>
      <span className="kxd-inv-field__label">
        {label}
        {required ? <span className="kxd-inv-req">*</span> : null}
      </span>
      {hint ? <span className="kxd-inv-field__hint">{hint}</span> : null}
      {children}
    </label>
  );
}

function UploadZone({
  title,
  hint,
  multiple,
  disabled,
  progress,
  onFiles,
  variant = "default",
}: {
  title: string;
  hint: string;
  multiple?: boolean;
  disabled?: boolean;
  progress?: number | null;
  onFiles: (files: FileList | File[]) => void;
  variant?: "default" | "primary" | "gallery";
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <label
      className={[
        "kxd-inv-upload",
        variant === "primary" ? "kxd-inv-upload--primary" : "",
        variant === "gallery" ? "kxd-inv-upload--gallery" : "",
        dragging ? "kxd-inv-upload--active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
      }}
    >
      <span className="kxd-inv-upload__icon" aria-hidden>
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 16V7m0 0l-3.5 3.5M12 7l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 16.5V18a2 2 0 002 2h10a2 2 0 002-2v-1.5" strokeLinecap="round" />
        </svg>
      </span>
      <span className="kxd-inv-upload__title">{title}</span>
      <span className="kxd-inv-upload__hint">{hint}</span>
      {progress != null ? (
        <span className="kxd-inv-upload__progress" role="status">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </span>
      ) : null}
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />
    </label>
  );
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
  const [saved, setSaved] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingKind, setUploadingKind] = useState<"primary" | "gallery" | null>(null);
  const [pending, startTransition] = useTransition();

  const pageTitle = mode === "create" ? "Add vehicle" : form.title || "Edit vehicle";
  const crumb = mode === "create" ? "Add vehicle" : "Edit vehicle";
  const isPublic = PUBLIC_SET.has(form.listingStatus);

  const livePrice = useMemo(
    () =>
      formatInventoryPrice({
        price: form.price ? Number(form.price) : null,
        priceDisplayMode: form.priceDisplayMode,
      }),
    [form.price, form.priceDisplayMode],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setSaved(false);
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (
        !slugTouched &&
        (key === "year" ||
          key === "make" ||
          key === "model" ||
          key === "trim" ||
          key === "title")
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

  function setPublicVisibility(next: "public" | "private") {
    if (next === "public" && !PUBLIC_SET.has(form.listingStatus)) {
      update("listingStatus", "available");
      return;
    }
    if (next === "private" && PUBLIC_SET.has(form.listingStatus)) {
      update("listingStatus", "draft");
    }
  }

  async function uploadOne(file: File): Promise<GalleryItem | null> {
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
      return null;
    }
    return {
      id: data.media.id as number,
      url: (data.media.path || data.media.url) as string,
      alt: String(data.media.alt ?? form.title ?? ""),
    };
  }

  async function uploadPrimary(files: FileList | File[]) {
    const file = Array.from(files)[0];
    if (!file) return;
    setError(null);
    setUploadingKind("primary");
    setUploadProgress(0.15);
    try {
      const media = await uploadOne(file);
      setUploadProgress(1);
      if (!media) return;
      setSaved(false);
      setForm((prev) => ({
        ...prev,
        primaryImageId: media.id,
        primaryImageUrl: media.url,
      }));
    } finally {
      setUploadingKind(null);
      setUploadProgress(null);
    }
  }

  async function uploadGallery(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setError(null);
    setUploadingKind("gallery");
    setGalleryOpen(true);
    const added: GalleryItem[] = [];
    try {
      for (let i = 0; i < list.length; i += 1) {
        setUploadProgress((i + 0.35) / list.length);
        const media = await uploadOne(list[i]!);
        if (media) added.push(media);
      }
      if (added.length) {
        setSaved(false);
        setForm((prev) => ({ ...prev, gallery: [...prev.gallery, ...added] }));
      }
    } finally {
      setUploadingKind(null);
      setUploadProgress(null);
    }
  }

  function removeGalleryImage(id: number) {
    setSaved(false);
    setForm((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((image) => image.id !== id),
    }));
  }

  function moveGalleryImage(id: number, direction: -1 | 1) {
    setSaved(false);
    setForm((prev) => {
      const index = prev.gallery.findIndex((image) => image.id === id);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.gallery.length) return prev;
      const gallery = [...prev.gallery];
      const [item] = gallery.splice(index, 1);
      gallery.splice(nextIndex, 0, item);
      return { ...prev, gallery };
    });
  }

  function clearPrimaryImage() {
    setSaved(false);
    setForm((prev) => ({
      ...prev,
      primaryImageId: null,
      primaryImageUrl: null,
    }));
  }

  function save() {
    startTransition(async () => {
      setError(null);
      setSaved(false);
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
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <CesPage className="kxd-inv-editor">
      <header className="kxd-inv-pagehead">
        <div className="kxd-inv-pagehead__copy">
          <p className="kxd-inv-pagehead__crumb">
            Inventory <span>/</span> {crumb}
          </p>
          <h1 className="kxd-inv-pagehead__title">{pageTitle}</h1>
          <p className="kxd-inv-pagehead__lead">
            Compose the listing carefully. VIN stays private. Public showroom only
            includes Available, Pending, and Coming Soon.
          </p>
        </div>
        <Link href="/portal/inventory" className="kxd-ces-btn kxd-ces-btn--ghost kxd-inv-pagehead__back">
          ← Back to inventory
        </Link>
      </header>

      {error ? (
        <p className="kxd-inv-error" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="kxd-inv-notice" role="status">
          Vehicle saved.
        </p>
      ) : null}

      <div className="kxd-inv-editor__layout">
        <div className="kxd-inv-editor__main">
          <section
            className="kxd-inv-panel kxd-inv-panel--primary"
            aria-labelledby="inv-identity"
          >
            <header className="kxd-inv-panel__head">
              <SectionNum n="01" />
              <div>
                <h2 id="inv-identity">Identity</h2>
                <p>Core listing details buyers see first.</p>
              </div>
            </header>
            <div className="kxd-inv-form__stack">
              <Field label="Title" required wide>
                <input
                  className="kxd-inv-input"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="2024 Radical SR3 XX"
                />
              </Field>
              <div className="kxd-inv-form__grid">
                <Field label="Slug">
                  <input
                    className="kxd-inv-input"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      update("slug", e.target.value);
                    }}
                    placeholder="2024-radical-sr3-xx"
                  />
                </Field>
                <Field label="Year">
                  <select
                    className="kxd-inv-input"
                    value={form.year}
                    onChange={(e) => update("year", e.target.value)}
                  >
                    <option value="">Select year</option>
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Make" required>
                  <input
                    className="kxd-inv-input"
                    value={form.make}
                    onChange={(e) => update("make", e.target.value)}
                    placeholder="Radical"
                  />
                </Field>
                <Field label="Model" required>
                  <input
                    className="kxd-inv-input"
                    value={form.model}
                    onChange={(e) => update("model", e.target.value)}
                    placeholder="SR3"
                  />
                </Field>
              </div>
              <Field label="Trim" wide>
                <input
                  className="kxd-inv-input"
                  value={form.trim}
                  onChange={(e) => update("trim", e.target.value)}
                  placeholder="XX"
                />
              </Field>
            </div>
          </section>

          <section
            className="kxd-inv-panel kxd-inv-panel--secondary"
            aria-labelledby="inv-pricing"
          >
            <header className="kxd-inv-panel__head">
              <SectionNum n="02" />
              <div>
                <h2 id="inv-pricing">Pricing &amp; status</h2>
                <p>Present price and condition with intention.</p>
              </div>
            </header>
            <div className="kxd-inv-form__stack">
              <div className="kxd-inv-form__grid">
                <Field label="Price (USD)">
                  <div className="kxd-inv-input-affix">
                    <span aria-hidden>$</span>
                    <input
                      className="kxd-inv-input"
                      value={form.price}
                      onChange={(e) => update("price", e.target.value)}
                      inputMode="decimal"
                      placeholder="125000"
                    />
                  </div>
                </Field>
                <Field label="Price display">
                  <select
                    className="kxd-inv-input"
                    value={form.priceDisplayMode}
                    onChange={(e) => update("priceDisplayMode", e.target.value)}
                  >
                    <option value="exact">Exact price</option>
                    <option value="contact">Contact for price</option>
                    <option value="call">Call for price</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </Field>
                <Field label="Mileage">
                  <input
                    className="kxd-inv-input"
                    value={form.mileage}
                    onChange={(e) => update("mileage", e.target.value)}
                    inputMode="numeric"
                    placeholder="120"
                  />
                </Field>
                <Field label="Stock number">
                  <input
                    className="kxd-inv-input"
                    value={form.stockNumber}
                    onChange={(e) => update("stockNumber", e.target.value)}
                    placeholder="PM-100"
                  />
                </Field>
                <Field label="VIN (private)">
                  <div className="kxd-inv-input-affix kxd-inv-input-affix--lock">
                    <span className="kxd-inv-lock" aria-hidden>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V8a4 4 0 018 0v3" />
                      </svg>
                    </span>
                    <input
                      className="kxd-inv-input"
                      value={form.vin}
                      onChange={(e) => update("vin", e.target.value)}
                      autoComplete="off"
                      placeholder="Never published"
                    />
                  </div>
                </Field>
                <Field label="Listing status">
                  <div className="kxd-inv-status-select">
                    <span
                      className={`kxd-inv-status-dot kxd-inv-status-dot--${inventoryStatusTone(form.listingStatus)}`}
                      aria-hidden
                    />
                    <select
                      className="kxd-inv-input"
                      value={form.listingStatus}
                      onChange={(e) => update("listingStatus", e.target.value)}
                    >
                      {Object.entries(LISTING_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
              </div>
              <div className="kxd-inv-field">
                <span className="kxd-inv-field__label">Condition</span>
                <div className="kxd-inv-segment" role="group" aria-label="Condition">
                  {(["new", "used"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        form.condition === value
                          ? "kxd-inv-segment__btn is-active"
                          : "kxd-inv-segment__btn"
                      }
                      aria-pressed={form.condition === value}
                      onClick={() => update("condition", value)}
                    >
                      {value === "new" ? "New" : "Used"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section
            className="kxd-inv-panel kxd-inv-panel--editorial"
            aria-labelledby="inv-copy"
          >
            <header className="kxd-inv-panel__head">
              <SectionNum n="03" />
              <div>
                <h2 id="inv-copy">Description</h2>
                <p>Editorial copy and structured facts for the vehicle page.</p>
              </div>
            </header>
            <div className="kxd-inv-form__stack">
              <Field label="Description" wide>
                <textarea
                  className="kxd-inv-input kxd-inv-input--textarea kxd-inv-input--textarea-lg"
                  value={form.description}
                  onChange={(e) =>
                    update("description", e.target.value.slice(0, DESC_LIMIT))
                  }
                  rows={12}
                  placeholder="Write a precise, buyer-facing description…"
                />
                <span className="kxd-inv-counter">
                  {form.description.length} / {DESC_LIMIT}
                </span>
              </Field>
              <div className="kxd-inv-form__grid">
                <Field label="Highlights (one per line)">
                  <textarea
                    className="kxd-inv-input kxd-inv-input--textarea kxd-inv-input--textarea-md"
                    value={form.highlightsText}
                    onChange={(e) =>
                      update("highlightsText", e.target.value.slice(0, LINE_LIMIT))
                    }
                    rows={9}
                  />
                  <span className="kxd-inv-counter">
                    {form.highlightsText.length} / {LINE_LIMIT}
                  </span>
                </Field>
                <Field label="Specifications (Label: Value)">
                  <textarea
                    className="kxd-inv-input kxd-inv-input--textarea kxd-inv-input--textarea-md"
                    value={form.specsText}
                    onChange={(e) =>
                      update("specsText", e.target.value.slice(0, LINE_LIMIT))
                    }
                    rows={9}
                    placeholder={"Engine: RPE 1340\nTransmission: Sequential"}
                  />
                  <span className="kxd-inv-counter">
                    {form.specsText.length} / {LINE_LIMIT}
                  </span>
                </Field>
              </div>
            </div>
          </section>
        </div>

        <aside className="kxd-inv-editor__aside">
          <section className="kxd-inv-railcard" aria-labelledby="inv-visibility">
            <header className="kxd-inv-railcard__head">
              <span className="kxd-inv-railcard__icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
                </svg>
              </span>
              <h2 id="inv-visibility">Visibility &amp; status</h2>
            </header>

            <div className="kxd-inv-field">
              <span className="kxd-inv-field__label">Public status</span>
              <div className="kxd-inv-status-select">
                <span className="kxd-inv-lock" aria-hidden>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 018 0v3" />
                  </svg>
                </span>
                <select
                  className="kxd-inv-input"
                  value={isPublic ? "public" : "private"}
                  onChange={(e) =>
                    setPublicVisibility(e.target.value as "public" | "private")
                  }
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>
            </div>

            <div className="kxd-inv-infobox" role="note">
              <span aria-hidden>i</span>
              <p>
                {isPublic
                  ? "This listing will appear on the public showroom after you save. VIN is never included."
                  : "This listing stays private until status is Available, Pending, or Coming Soon."}
              </p>
            </div>

            <div className="kxd-inv-toggle-row">
              <div>
                <p className="kxd-inv-toggle-row__label">Featured on showroom</p>
                <p className="kxd-inv-field__hint">
                  Elevates the vehicle when publicly visible.
                </p>
              </div>
              <KxdToggle
                label={<span className="sr-only">Featured on showroom</span>}
                checked={form.featured}
                onChange={(e) => update("featured", e.target.checked)}
              />
            </div>
          </section>

          <section className="kxd-inv-railcard kxd-inv-railcard--media" aria-labelledby="inv-media">
            <header className="kxd-inv-railcard__head">
              <span className="kxd-inv-railcard__icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="9" cy="11" r="1.5" />
                  <path d="M21 16l-5-5-7 7" />
                </svg>
              </span>
              <h2 id="inv-media">Media</h2>
            </header>

            <div className="kxd-inv-media-rail">
              <p className="kxd-inv-field__label">Primary image</p>
              {form.primaryImageUrl ? (
                <div className="kxd-inv-media-rail__hero">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.primaryImageUrl} alt="" />
                  <button
                    type="button"
                    className="kxd-ces-btn kxd-ces-btn--ghost"
                    onClick={clearPrimaryImage}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              <UploadZone
                title="Drag & drop or click to upload"
                hint="Primary photo · Max 12 MB"
                variant="primary"
                disabled={uploadingKind != null}
                progress={uploadingKind === "primary" ? uploadProgress : null}
                onFiles={(files) => void uploadPrimary(files)}
              />

              <p className="kxd-inv-field__label">Gallery images</p>
              <UploadZone
                title="Drag & drop or click to upload"
                hint="Multiple images supported · Max 12 MB each"
                variant="gallery"
                multiple
                disabled={uploadingKind != null}
                progress={uploadingKind === "gallery" ? uploadProgress : null}
                onFiles={(files) => void uploadGallery(files)}
              />

              <div className="kxd-inv-media-rail__foot">
                <span>
                  {form.gallery.length} image{form.gallery.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  className="kxd-ces-btn kxd-ces-btn--ghost"
                  onClick={() => setGalleryOpen((v) => !v)}
                  disabled={form.gallery.length === 0}
                >
                  {galleryOpen ? "Hide gallery" : "Manage gallery"}
                </button>
              </div>

              {galleryOpen && form.gallery.length > 0 ? (
                <ul className="kxd-inv-gallery">
                  {form.gallery.map((image, index) => (
                    <li key={image.id} className="kxd-inv-gallery__item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={image.alt} />
                      <div className="kxd-inv-gallery__controls">
                        <button
                          type="button"
                          aria-label="Move earlier"
                          disabled={index === 0}
                          onClick={() => moveGalleryImage(image.id, -1)}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          aria-label="Move later"
                          disabled={index === form.gallery.length - 1}
                          onClick={() => moveGalleryImage(image.id, 1)}
                        >
                          →
                        </button>
                        <button
                          type="button"
                          aria-label="Remove image"
                          onClick={() => removeGalleryImage(image.id)}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>

          <section className="kxd-inv-railcard" aria-labelledby="inv-preview">
            <header className="kxd-inv-railcard__head">
              <span className="kxd-inv-railcard__icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              </span>
              <h2 id="inv-preview">Preview</h2>
            </header>

            {preview ? (
              <article className="kxd-inv-preview-card">
                <div className="kxd-inv-preview-card__media">
                  {preview.primaryImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview.primaryImage.url} alt={preview.primaryImage.alt} />
                  ) : (
                    <div className="kxd-inv-preview-card__ph">No photo</div>
                  )}
                </div>
                <div className="kxd-inv-preview-card__body">
                  <div className="kxd-inv-preview-card__meta">
                    <span
                      className={`kxd-ces-status kxd-ces-status--${inventoryStatusTone(preview.listingStatus)}`}
                    >
                      {inventoryStatusLabel(preview.listingStatus)}
                    </span>
                    <span>{inventoryGroupLabel(preview.inventoryGroup)}</span>
                  </div>
                  <h3>{preview.title}</h3>
                  <p>{formatInventoryIdentity(preview)}</p>
                  <p className="kxd-inv-preview-card__price">
                    {formatInventoryPrice(preview)}
                  </p>
                </div>
              </article>
            ) : (
              <div className="kxd-inv-preview-empty">
                <span className="kxd-inv-preview-empty__glyph" aria-hidden>
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="9" cy="11" r="1.5" />
                    <path d="M21 16l-5-5-7 7" />
                  </svg>
                </span>
                <p>
                  Vehicle preview will appear here. Preview updates automatically as
                  you save changes.
                </p>
                <p className="kxd-inv-field__hint">
                  Draft pricing reads as {livePrice}.{" "}
                  {isPublic
                    ? "Current status is public."
                    : "Current status is private."}
                </p>
              </div>
            )}
          </section>

          <section className="kxd-inv-actions" aria-label="Vehicle actions">
            <button
              type="button"
              className="kxd-ces-btn kxd-ces-btn--primary kxd-inv-actions__primary"
              onClick={save}
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Saving…" : "Save vehicle"}
            </button>
            <Link href="/portal/inventory" className="kxd-ces-btn kxd-ces-btn--ghost kxd-inv-actions__cancel">
              Cancel
            </Link>
            {mode === "edit" ? (
              <button
                type="button"
                className="kxd-inv-danger"
                disabled={pending || form.listingStatus === "hidden"}
                onClick={() => update("listingStatus", "hidden")}
              >
                <span aria-hidden>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.7a2.5 2.5 0 003.5 3.5" />
                    <path d="M9.9 5.1A10.5 10.5 0 0121.9 12S18.4 18 12 18c-.9 0-1.7-.1-2.5-.3" />
                    <path d="M6.1 6.3C3.8 7.9 2.1 10 2.1 12S5.6 18 12 18" />
                  </svg>
                </span>
                Hide from showroom
              </button>
            ) : null}
            {mode === "edit" ? (
              <p className="kxd-inv-actions__note">
                Sets status to Hidden. Save to apply. Permanent deletion stays in KXD OS
                admin.
              </p>
            ) : null}
          </section>
        </aside>
      </div>
    </CesPage>
  );
}
