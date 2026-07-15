"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { WebsiteReviewAttachmentMeta } from "@/lib/ces/modules/website-review/attachments";
import { formatAttachmentSize } from "@/lib/ces/modules/website-review/attachments";
import {
  WEBSITE_WORKSPACE_MAX_ATTACHMENTS,
  WEBSITE_WORKSPACE_MAX_FILE_BYTES,
} from "@/lib/ces/modules/website-workspace/constants";
import type { WebsiteWorkspaceSectionDefinition } from "@/lib/ces/modules/website-workspace/types";

type Props = {
  open: boolean;
  pageSlug: string;
  pageTitle: string;
  section: WebsiteWorkspaceSectionDefinition | null;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSubmitted: (requestId: number) => void;
};

function supportsImages(section: WebsiteWorkspaceSectionDefinition): boolean {
  return section.fields.includes("image") || section.fields.includes("images");
}

export function WebsiteWorkspaceEditPanel({
  open,
  pageSlug,
  pageTitle,
  section,
  returnFocusRef,
  onClose,
  onSubmitted,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [cta, setCta] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<WebsiteReviewAttachmentMeta[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !section) return;
    setHeading("");
    setBody("");
    setCta("");
    setNotes("");
    setAttachments([]);
    setError(null);
    setPending(false);
    setUploading(false);
    setDragging(false);
  }, [open, section]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarGap > 0) {
      document.body.style.paddingRight = `${scrollbarGap}px`;
    }

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", onKey);
      returnFocusRef?.current?.focus();
    };
  }, [open, onClose, returnFocusRef]);

  if (!mounted || !open || !section) return null;

  const showHeading = section.fields.includes("heading");
  const showBody = section.fields.includes("body");
  const showCta = section.fields.includes("cta");
  const showImage = supportsImages(section);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (list.length === 0) {
      setError("Please upload image files.");
      return;
    }

    const remaining = WEBSITE_WORKSPACE_MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      setError(`Maximum ${WEBSITE_WORKSPACE_MAX_ATTACHMENTS} images allowed.`);
      return;
    }

    const accepted = list.slice(0, remaining);
    if (list.length > remaining) {
      setError(
        `You can add ${remaining} more image${remaining === 1 ? "" : "s"} (max ${WEBSITE_WORKSPACE_MAX_ATTACHMENTS}).`,
      );
    } else {
      setError(null);
    }

    setUploading(true);

    try {
      for (const file of accepted) {
        if (file.size > WEBSITE_WORKSPACE_MAX_FILE_BYTES) {
          throw new Error(
            `${file.name} is too large. Images must be ${formatAttachmentSize(WEBSITE_WORKSPACE_MAX_FILE_BYTES)} or smaller.`,
          );
        }
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/portal/website-workspace/upload", {
          method: "POST",
          body: formData,
        });
        const json = (await res.json()) as {
          ok?: boolean;
          message?: string;
          attachment?: WebsiteReviewAttachmentMeta;
        };
        if (!res.ok || !json.ok || !json.attachment) {
          throw new Error(json.message || "Upload failed.");
        }
        setAttachments((prev) => [...prev, json.attachment!]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!section) return;
    const sectionId = section.id;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/website-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageSlug,
          sectionId,
          notes,
          requested: { heading, body, cta },
          attachmentIds: attachments.map((item) => item.id),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; id?: number; message?: string };
      if (!res.ok || !json.ok || !json.id) {
        throw new Error(json.message || "Could not submit request.");
      }
      onSubmitted(json.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit request.");
      setPending(false);
    }
  }

  return createPortal(
    <div className="kxd-ws-drawer" role="presentation">
      <button
        type="button"
        className="kxd-ws-drawer__backdrop"
        aria-label="Close edit request"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className="kxd-ws-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="kxd-ws-drawer__head">
          <div>
            <p className="kxd-ws-drawer__eyebrow">
              {pageTitle} · {section.title}
            </p>
            <h2 id={titleId}>Edit request</h2>
            <p className="kxd-ws-drawer__lead">
              Requested changes are reviewed by KXD before anything goes live.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="kxd-ces-btn kxd-ces-btn--ghost"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="kxd-ws-drawer__body">
          <section className="kxd-ws-snapshot">
            <h3>Current content</h3>
            {showHeading ? (
              <div className="kxd-ws-snapshot__block">
                <span>Heading</span>
                <p>{section.current.heading || "—"}</p>
              </div>
            ) : null}
            {showBody ? (
              <div className="kxd-ws-snapshot__block">
                <span>Body</span>
                <p>{section.current.body || "—"}</p>
              </div>
            ) : null}
            {showCta ? (
              <div className="kxd-ws-snapshot__block">
                <span>CTA</span>
                <p>{section.current.cta || "—"}</p>
              </div>
            ) : null}
            {showImage ? (
              <div className="kxd-ws-snapshot__media">
                <span>Current image</span>
                {section.current.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={section.current.imageUrl} alt={section.current.imageAlt || ""} />
                ) : (
                  <div className="kxd-ws-snapshot__ph">No image on file</div>
                )}
              </div>
            ) : null}
          </section>

          <section className="kxd-ws-request-fields">
            <h3>Requested changes</h3>
            {showHeading ? (
              <label className="kxd-ws-field">
                <span>New heading</span>
                <input
                  className="kxd-ws-input"
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  placeholder={section.current.heading || "Updated heading"}
                />
              </label>
            ) : null}
            {showBody ? (
              <label className="kxd-ws-field">
                <span>New body</span>
                <textarea
                  className="kxd-ws-input kxd-ws-input--textarea"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={7}
                  placeholder={section.current.body || "Updated body copy"}
                />
              </label>
            ) : null}
            {showCta ? (
              <label className="kxd-ws-field">
                <span>New CTA</span>
                <input
                  className="kxd-ws-input"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder={section.current.cta || "Updated call to action"}
                />
              </label>
            ) : null}
            <label className="kxd-ws-field">
              <span>Notes</span>
              <textarea
                className="kxd-ws-input kxd-ws-input--textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Anything KXD should know about this update…"
              />
            </label>

            {showImage ? (
              <div className="kxd-ws-field">
                <span>Replacement image</span>
                <label
                  className={`kxd-ws-upload${dragging ? " is-active" : ""}`}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
                  }}
                >
                  <strong>Drag & drop or click to upload</strong>
                  <em>
                    Up to {WEBSITE_WORKSPACE_MAX_ATTACHMENTS} images · Max{" "}
                    {formatAttachmentSize(WEBSITE_WORKSPACE_MAX_FILE_BYTES)} each
                    {attachments.length > 0
                      ? ` · ${attachments.length} of ${WEBSITE_WORKSPACE_MAX_ATTACHMENTS} added`
                      : ""}
                  </em>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={
                      uploading ||
                      pending ||
                      attachments.length >= WEBSITE_WORKSPACE_MAX_ATTACHMENTS
                    }
                    onChange={(e) => {
                      if (e.target.files?.length) void uploadFiles(e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {attachments.length > 0 ? (
                  <ul className="kxd-ws-upload-list">
                    {attachments.map((item) => (
                      <li key={item.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt="" />
                        <span>{item.filename}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAttachments((prev) => prev.filter((row) => row.id !== item.id))
                          }
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </section>

          {error ? (
            <p className="kxd-ws-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="kxd-ws-drawer__foot">
          <button
            type="button"
            className="kxd-ces-btn kxd-ces-btn--primary"
            disabled={pending || uploading}
            aria-busy={pending}
            onClick={() => void submit()}
          >
            {pending ? "Submitting…" : "Submit update request"}
          </button>
          <button
            type="button"
            className="kxd-ces-btn kxd-ces-btn--ghost"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
