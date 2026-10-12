"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  OwnerNetworkProfileFields,
  OwnerNetworkShowcaseFields,
} from "@/lib/portal/partner/network-directory-rules";

type NetworkDirectoryOwnerPanelProps = {
  selectedPartnerId: number | null;
  selectedPartnerName: string | null;
  partnerOptions: Array<{ id: number; displayName: string }>;
  initialProfile: OwnerNetworkProfileFields | null;
  initialShowcase: OwnerNetworkShowcaseFields[];
};

type ProfileForm = {
  directoryVisibility: "private" | "published";
  cityMarket: string;
  companyOrRole: string;
  connectionLane1: string;
  connectionLane2: string;
  connectionLane3: string;
  profileLine: string;
  directoryMarkId: string;
  directoryMarkUrl: string | null;
  trustedPartner: boolean;
};

type ShowcaseForm = {
  id: number | null;
  directoryVisibility: "private" | "published";
  companyName: string;
  categoryMarket: string;
  workDescription: string;
  markId: string;
  markUrl: string | null;
  websiteUrl: string;
  creditedPartnerId: string;
  creditedPartnerName: string | null;
  creditAttribution: boolean;
  ownerApprovedForNetwork: boolean;
  sortOrder: string;
};

type MediaOption = {
  id: number;
  url: string | null;
  alt: string;
};

const EMPTY_SHOWCASE: ShowcaseForm = {
  id: null,
  directoryVisibility: "private",
  companyName: "",
  categoryMarket: "",
  workDescription: "",
  markId: "",
  markUrl: null,
  websiteUrl: "",
  creditedPartnerId: "",
  creditedPartnerName: null,
  creditAttribution: false,
  ownerApprovedForNetwork: false,
  sortOrder: "0",
};

function toProfileForm(profile: OwnerNetworkProfileFields): ProfileForm {
  return {
    directoryVisibility: profile.directoryVisibility,
    cityMarket: profile.cityMarket,
    companyOrRole: profile.companyOrRole,
    connectionLane1: profile.connectionLane1,
    connectionLane2: profile.connectionLane2,
    connectionLane3: profile.connectionLane3,
    profileLine: profile.profileLine,
    directoryMarkId:
      profile.directoryMarkId != null ? String(profile.directoryMarkId) : "",
    directoryMarkUrl: profile.directoryMarkUrl,
    trustedPartner: profile.trustedPartner,
  };
}

function toShowcaseForm(item: OwnerNetworkShowcaseFields): ShowcaseForm {
  return {
    id: item.id,
    directoryVisibility: item.directoryVisibility,
    companyName: item.companyName,
    categoryMarket: item.categoryMarket,
    workDescription: item.workDescription,
    markId: item.markId != null ? String(item.markId) : "",
    markUrl: item.markUrl,
    websiteUrl: item.websiteUrl,
    creditedPartnerId:
      item.creditedPartnerId != null ? String(item.creditedPartnerId) : "",
    creditedPartnerName: item.creditedPartnerName,
    creditAttribution: item.creditAttribution,
    ownerApprovedForNetwork: item.ownerApprovedForNetwork,
    sortOrder: String(item.sortOrder ?? 0),
  };
}

function mediaUrlFromDoc(doc: Record<string, unknown>): string | null {
  if (typeof doc.url === "string" && doc.url.trim()) return doc.url.trim();
  const filename = typeof doc.filename === "string" ? doc.filename.trim() : "";
  if (filename) return `/media/${filename.replace(/^\/+/, "")}`;
  return null;
}

async function loadApprovedMediaOptions(): Promise<MediaOption[]> {
  const res = await fetch("/api/media?limit=24&depth=0&sort=-updatedAt", {
    credentials: "same-origin",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    docs?: Array<Record<string, unknown>>;
  };
  return (data.docs ?? [])
    .map((doc) => {
      const id = Number(doc.id);
      if (!Number.isFinite(id) || id <= 0) return null;
      return {
        id,
        url: mediaUrlFromDoc(doc),
        alt:
          (typeof doc.alt === "string" && doc.alt.trim()) ||
          (typeof doc.filename === "string" && doc.filename.trim()) ||
          `Media ${id}`,
      };
    })
    .filter((row): row is MediaOption => row != null);
}

function ApprovedMarkControl({
  selectedId,
  selectedUrl,
  onSelect,
  onClear,
}: {
  selectedId: string;
  selectedUrl: string | null;
  onSelect: (id: number, url: string | null) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<MediaOption[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPicker() {
    setOpen(true);
    setError(null);
    if (options) return;
    setBusy(true);
    try {
      const rows = await loadApprovedMediaOptions();
      setOptions(rows);
      if (rows.length === 0) {
        setError("No approved media found in the library yet.");
      }
    } catch {
      setError("Could not load the media library.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kxd-nc__mark-control">
      <span className="kxd-nc__group-label">Approved mark or portrait</span>
      <div className="kxd-nc__mark-row">
        {selectedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="kxd-nc__mark-preview"
            src={selectedUrl}
            alt=""
            width={48}
            height={48}
          />
        ) : (
          <span className="kxd-nc__mark-preview is-empty" aria-hidden />
        )}
        <div className="kxd-nc__mark-actions">
          <p className="kxd-nc__mark-state">
            {selectedId
              ? "An approved mark is selected."
              : "No mark selected."}
          </p>
          <div className="kxd-nc__record-actions">
            <button
              type="button"
              className="kxd-nc__text-action"
              onClick={() => void openPicker()}
            >
              Choose approved mark or portrait
            </button>
            {selectedId ? (
              <button
                type="button"
                className="kxd-nc__text-action"
                onClick={onClear}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {open ? (
        <div className="kxd-nc__mark-picker" role="listbox" aria-label="Approved media">
          {busy ? <p className="kxd-nc__help">Loading library…</p> : null}
          {error ? <p className="kxd-nc__help">{error}</p> : null}
          {options && options.length > 0 ? (
            <ul className="kxd-nc__mark-options">
              {options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className={
                      selectedId === String(option.id)
                        ? "kxd-nc__mark-option is-selected"
                        : "kxd-nc__mark-option"
                    }
                    onClick={() => {
                      onSelect(option.id, option.url);
                      setOpen(false);
                    }}
                  >
                    {option.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={option.url} alt="" width={36} height={36} />
                    ) : (
                      <span className="kxd-nc__mark-preview is-empty" aria-hidden />
                    )}
                    <span>{option.alt}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            className="kxd-nc__text-action"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}

function NetworkDirectoryOwnerPanelInner({
  selectedPartnerId,
  selectedPartnerName,
  partnerOptions,
  initialProfile,
  initialShowcase,
}: NetworkDirectoryOwnerPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm | null>(
    initialProfile ? toProfileForm(initialProfile) : null,
  );
  const [showcase] = useState(initialShowcase);
  const [showcaseForm, setShowcaseForm] = useState<ShowcaseForm>(EMPTY_SHOWCASE);
  const [busy, setBusy] = useState(false);

  async function saveProfile() {
    if (!selectedPartnerId || !profileForm) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/partner/network-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: selectedPartnerId,
          directoryVisibility: profileForm.directoryVisibility,
          cityMarket: profileForm.cityMarket,
          companyOrRole: profileForm.companyOrRole,
          connectionLane1: profileForm.connectionLane1,
          connectionLane2: profileForm.connectionLane2,
          connectionLane3: profileForm.connectionLane3,
          profileLine: profileForm.profileLine,
          directoryMarkId: profileForm.directoryMarkId.trim()
            ? Number(profileForm.directoryMarkId)
            : null,
          trustedPartner: profileForm.trustedPartner,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setMessage(data.error || "Could not save Network profile.");
        return;
      }
      setMessage("Network profile saved.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveShowcase() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/partner/network-showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: showcaseForm.id ?? undefined,
          directoryVisibility: showcaseForm.directoryVisibility,
          companyName: showcaseForm.companyName,
          categoryMarket: showcaseForm.categoryMarket,
          workDescription: showcaseForm.workDescription,
          markId: showcaseForm.markId.trim()
            ? Number(showcaseForm.markId)
            : null,
          websiteUrl: showcaseForm.websiteUrl,
          creditedPartnerId: showcaseForm.creditedPartnerId.trim()
            ? Number(showcaseForm.creditedPartnerId)
            : null,
          creditAttribution: showcaseForm.creditAttribution,
          ownerApprovedForNetwork: showcaseForm.ownerApprovedForNetwork,
          sortOrder: Number(showcaseForm.sortOrder) || 0,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setMessage(data.error || "Could not save selected work.");
        return;
      }
      setMessage(
        showcaseForm.id
          ? "Selected work updated."
          : "Selected work created.",
      );
      setShowcaseForm(EMPTY_SHOWCASE);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="kxd-nc__network-curation"
      aria-labelledby="kxd-nc-network-curation-heading"
    >
      <header className="kxd-nc__network-curation-head">
        <h2
          className="kxd-nc__network-curation-title"
          id="kxd-nc-network-curation-heading"
        >
          Network publication
        </h2>
        <p className="kxd-nc__network-curation-lead">
          Profile and selected work shown to active partners.
          {selectedPartnerName ? ` Editing ${selectedPartnerName}.` : ""}
        </p>
      </header>

      {selectedPartnerId && profileForm ? (
        <details className="kxd-nc__disclose kxd-nc__disclose--network">
          <summary>Network profile</summary>
          <div className="kxd-nc__disclose-body">
            <p className="kxd-nc__help">
              Published profiles are visible only to active KXD Network
              partners. Keep it concise and factual.
            </p>

            <div className="kxd-nc__editor-group">
              <p className="kxd-nc__group-title">Identity</p>
              <div className="kxd-nc__form-grid">
                <label>
                  <span>Visibility</span>
                  <select
                    value={profileForm.directoryVisibility}
                    onChange={(e) =>
                      setProfileForm((current) =>
                        current
                          ? {
                              ...current,
                              directoryVisibility: e.target.value as
                                | "private"
                                | "published",
                            }
                          : current,
                      )
                    }
                  >
                    <option value="private">Private</option>
                    <option value="published">Published</option>
                  </select>
                </label>
                <label>
                  <span>City or market</span>
                  <input
                    value={profileForm.cityMarket}
                    onChange={(e) =>
                      setProfileForm((current) =>
                        current
                          ? { ...current, cityMarket: e.target.value }
                          : current,
                      )
                    }
                  />
                </label>
                <label className="kxd-nc__span-2">
                  <span>Company or role</span>
                  <input
                    value={profileForm.companyOrRole}
                    onChange={(e) =>
                      setProfileForm((current) =>
                        current
                          ? { ...current, companyOrRole: e.target.value }
                          : current,
                      )
                    }
                  />
                </label>
                <label className="kxd-nc__span-2">
                  <span>Profile line</span>
                  <input
                    value={profileForm.profileLine}
                    maxLength={160}
                    onChange={(e) =>
                      setProfileForm((current) =>
                        current
                          ? { ...current, profileLine: e.target.value }
                          : current,
                      )
                    }
                  />
                </label>
                <div className="kxd-nc__span-2">
                  <ApprovedMarkControl
                    selectedId={profileForm.directoryMarkId}
                    selectedUrl={profileForm.directoryMarkUrl}
                    onSelect={(id, url) =>
                      setProfileForm((current) =>
                        current
                          ? {
                              ...current,
                              directoryMarkId: String(id),
                              directoryMarkUrl: url,
                            }
                          : current,
                      )
                    }
                    onClear={() =>
                      setProfileForm((current) =>
                        current
                          ? {
                              ...current,
                              directoryMarkId: "",
                              directoryMarkUrl: null,
                            }
                          : current,
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <div className="kxd-nc__editor-group">
              <p className="kxd-nc__group-title">Connection</p>
              <div className="kxd-nc__form-grid">
                <label>
                  <span>Lane 1</span>
                  <input
                    value={profileForm.connectionLane1}
                    onChange={(e) =>
                      setProfileForm((current) =>
                        current
                          ? { ...current, connectionLane1: e.target.value }
                          : current,
                      )
                    }
                  />
                </label>
                <label>
                  <span>Lane 2</span>
                  <input
                    value={profileForm.connectionLane2}
                    onChange={(e) =>
                      setProfileForm((current) =>
                        current
                          ? { ...current, connectionLane2: e.target.value }
                          : current,
                      )
                    }
                  />
                </label>
                <label>
                  <span>Lane 3</span>
                  <input
                    value={profileForm.connectionLane3}
                    onChange={(e) =>
                      setProfileForm((current) =>
                        current
                          ? { ...current, connectionLane3: e.target.value }
                          : current,
                      )
                    }
                  />
                </label>
                <label className="kxd-nc__check">
                  <input
                    type="checkbox"
                    checked={profileForm.trustedPartner}
                    onChange={(e) =>
                      setProfileForm((current) =>
                        current
                          ? { ...current, trustedPartner: e.target.checked }
                          : current,
                      )
                    }
                  />
                  <span>Trusted Partner</span>
                </label>
              </div>
            </div>

            <div className="kxd-nc__editor-actions">
              <button
                type="button"
                className="kxd-nc__btn kxd-nc__btn--quiet"
                disabled={busy}
                onClick={() => void saveProfile()}
              >
                Save Network profile
              </button>
            </div>
          </div>
        </details>
      ) : null}

      <details
        className="kxd-nc__disclose kxd-nc__disclose--network"
        data-qa="selected-work"
      >
        <summary>Selected work</summary>
        <div className="kxd-nc__disclose-body">
          <p className="kxd-nc__help">
            Completed work only. Prospects and live pipeline stay out.
          </p>
          {showcase.length > 0 ? (
            <ul className="kxd-nc__showcase-list">
              {showcase.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="kxd-nc__text-action"
                    onClick={() => setShowcaseForm(toShowcaseForm(item))}
                  >
                    {item.companyName}
                  </button>
                  <span>
                    {item.directoryVisibility === "published"
                      ? "Published"
                      : "Private"}
                    {item.ownerApprovedForNetwork
                      ? " · Ready for Network"
                      : " · Needs approval"}
                    {item.creditAttribution && item.creditedPartnerName
                      ? ` · with ${item.creditedPartnerName}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="kxd-nc__help">No selected work yet.</p>
          )}

          <div className="kxd-nc__editor-group">
            <p className="kxd-nc__group-title">
              {showcaseForm.id ? "Edit work" : "Add work"}
            </p>
            <div className="kxd-nc__form-grid">
              <label className="kxd-nc__span-2">
                <span>Company</span>
                <input
                  value={showcaseForm.companyName}
                  onChange={(e) =>
                    setShowcaseForm((current) => ({
                      ...current,
                      companyName: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>Visibility</span>
                <select
                  value={showcaseForm.directoryVisibility}
                  onChange={(e) =>
                    setShowcaseForm((current) => ({
                      ...current,
                      directoryVisibility: e.target.value as
                        | "private"
                        | "published",
                    }))
                  }
                >
                  <option value="private">Private</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <label>
                <span>Category or market</span>
                <input
                  value={showcaseForm.categoryMarket}
                  onChange={(e) =>
                    setShowcaseForm((current) => ({
                      ...current,
                      categoryMarket: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="kxd-nc__span-2">
                <span>Work description</span>
                <input
                  value={showcaseForm.workDescription}
                  maxLength={200}
                  onChange={(e) =>
                    setShowcaseForm((current) => ({
                      ...current,
                      workDescription: e.target.value,
                    }))
                  }
                />
              </label>
              <div className="kxd-nc__span-2">
                <ApprovedMarkControl
                  selectedId={showcaseForm.markId}
                  selectedUrl={showcaseForm.markUrl}
                  onSelect={(id, url) =>
                    setShowcaseForm((current) => ({
                      ...current,
                      markId: String(id),
                      markUrl: url,
                    }))
                  }
                  onClear={() =>
                    setShowcaseForm((current) => ({
                      ...current,
                      markId: "",
                      markUrl: null,
                    }))
                  }
                />
              </div>
              <label className="kxd-nc__span-2">
                <span>Public website</span>
                <input
                  value={showcaseForm.websiteUrl}
                  onChange={(e) =>
                    setShowcaseForm((current) => ({
                      ...current,
                      websiteUrl: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>Credit partner</span>
                <select
                  value={showcaseForm.creditedPartnerId}
                  onChange={(e) =>
                    setShowcaseForm((current) => ({
                      ...current,
                      creditedPartnerId: e.target.value,
                      creditedPartnerName: null,
                    }))
                  }
                >
                  <option value="">None</option>
                  {partnerOptions.map((row) => (
                    <option key={row.id} value={String(row.id)}>
                      {row.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Order</span>
                <input
                  value={showcaseForm.sortOrder}
                  inputMode="numeric"
                  onChange={(e) =>
                    setShowcaseForm((current) => ({
                      ...current,
                      sortOrder: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="kxd-nc__check">
                <input
                  type="checkbox"
                  checked={showcaseForm.creditAttribution}
                  onChange={(e) =>
                    setShowcaseForm((current) => ({
                      ...current,
                      creditAttribution: e.target.checked,
                    }))
                  }
                />
                <span>Show partner credit</span>
              </label>
              <label className="kxd-nc__check">
                <input
                  type="checkbox"
                  checked={showcaseForm.ownerApprovedForNetwork}
                  onChange={(e) =>
                    setShowcaseForm((current) => ({
                      ...current,
                      ownerApprovedForNetwork: e.target.checked,
                    }))
                  }
                />
                <span>Approved for Network</span>
              </label>
            </div>
          </div>

          <div className="kxd-nc__editor-actions">
            <button
              type="button"
              className="kxd-nc__btn kxd-nc__btn--quiet"
              disabled={busy}
              onClick={() => void saveShowcase()}
            >
              {showcaseForm.id ? "Save selected work" : "Add selected work"}
            </button>
            {showcaseForm.id ? (
              <button
                type="button"
                className="kxd-nc__text-action"
                onClick={() => setShowcaseForm(EMPTY_SHOWCASE)}
              >
                Clear form
              </button>
            ) : null}
          </div>
        </div>
      </details>

      {message ? <p className="kxd-nc__notice">{message}</p> : null}
    </section>
  );
}

export function NetworkDirectoryOwnerPanel(
  props: NetworkDirectoryOwnerPanelProps,
) {
  const remountKey = [
    props.selectedPartnerId ?? "none",
    props.initialProfile?.partnerId ?? "noprofile",
    props.initialShowcase.map((row) => row.id).join("-") || "empty",
  ].join(":");
  return <NetworkDirectoryOwnerPanelInner key={remountKey} {...props} />;
}
