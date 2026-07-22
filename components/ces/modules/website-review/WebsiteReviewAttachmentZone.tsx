"use client";

import { useCallback, useId, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { CesField } from "@/components/ces/primitives";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import {
  formatAttachmentSize,
  isWebsiteReviewImageMime,
  isWebsiteReviewMimeAllowed,
  resolveWebsiteReviewMimeType,
  WEBSITE_REVIEW_MAX_ATTACHMENTS,
  WEBSITE_REVIEW_MAX_FILE_BYTES,
} from "@/lib/ces/modules/website-review/attachments";
import type { WebsiteReviewPendingAttachment } from "@/lib/ces/modules/website-review/types";

function createLocalId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function fileIconLabel(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "IMG";
  if (mimeType === "application/pdf") return "PDF";
  return "DOC";
}

export interface WebsiteReviewAttachmentZoneProps {
  attachments: WebsiteReviewPendingAttachment[];
  onChange: Dispatch<SetStateAction<WebsiteReviewPendingAttachment[]>>;
  disabled?: boolean;
}

export function WebsiteReviewAttachmentZone({
  attachments,
  onChange,
  disabled = false,
}: WebsiteReviewAttachmentZoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);

  const readyCount = attachments.filter((a) => a.status === "ready").length;
  const activeCount = attachments.filter((a) => a.status !== "error").length;
  const uploading = attachments.some((a) => a.status === "uploading");

  const uploadFile = useCallback(
    async (file: File) => {
      const mimeType = resolveWebsiteReviewMimeType(file.type, file.name);

      if (!isWebsiteReviewMimeAllowed(mimeType)) {
        setZoneError(PORTAL_CLIENT_LANGUAGE.attachmentTypeError);
        return;
      }

      if (file.size > WEBSITE_REVIEW_MAX_FILE_BYTES) {
        setZoneError(PORTAL_CLIENT_LANGUAGE.attachmentSizeError);
        return;
      }

      if (activeCount >= WEBSITE_REVIEW_MAX_ATTACHMENTS) {
        setZoneError(PORTAL_CLIENT_LANGUAGE.attachmentLimitError);
        return;
      }

      setZoneError(null);

      const localId = createLocalId();
      const isImage = isWebsiteReviewImageMime(mimeType);
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

      const pending: WebsiteReviewPendingAttachment = {
        localId,
        filename: file.name,
        mimeType,
        filesize: file.size,
        isImage,
        previewUrl,
        status: "uploading",
        progress: 0,
      };

      onChange((prev) => [...prev, pending]);

      await new Promise<void>((resolve) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append("file", file);

        xhr.upload.addEventListener("progress", (event) => {
          if (!event.lengthComputable) return;
          const progress = Math.round((event.loaded / event.total) * 100);
          onChange((prev) =>
            prev.map((item) => (item.localId === localId ? { ...item, progress } : item)),
          );
        });

        xhr.addEventListener("load", () => {
          try {
            const data = JSON.parse(xhr.responseText) as {
              ok?: boolean;
              attachment?: {
                id: number;
                filename: string;
                mimeType: string;
                filesize: number;
                isImage: boolean;
                url: string;
              };
              message?: string;
            };

            if (xhr.status >= 200 && xhr.status < 300 && data.ok && data.attachment) {
              onChange((prev) =>
                prev.map((item) =>
                  item.localId === localId
                    ? {
                        ...item,
                        id: data.attachment!.id,
                        filename: data.attachment!.filename,
                        mimeType: data.attachment!.mimeType,
                        filesize: data.attachment!.filesize,
                        isImage: data.attachment!.isImage,
                        status: "ready" as const,
                        progress: 100,
                      }
                    : item,
                ),
              );
            } else {
              onChange((prev) =>
                prev.map((item) =>
                  item.localId === localId
                    ? {
                        ...item,
                        status: "error" as const,
                        error: data.message ?? PORTAL_CLIENT_LANGUAGE.attachmentUploadError,
                      }
                    : item,
                ),
              );
            }
          } catch {
            onChange((prev) =>
              prev.map((item) =>
                item.localId === localId
                  ? {
                      ...item,
                      status: "error" as const,
                      error: PORTAL_CLIENT_LANGUAGE.attachmentUploadError,
                    }
                  : item,
              ),
            );
          }
          resolve();
        });

        xhr.addEventListener("error", () => {
          onChange((prev) =>
            prev.map((item) =>
              item.localId === localId
                ? {
                    ...item,
                    status: "error" as const,
                    error: PORTAL_CLIENT_LANGUAGE.attachmentUploadError,
                  }
                : item,
            ),
          );
          resolve();
        });

        xhr.open("POST", "/api/portal/website-review/upload");
        xhr.send(formData);
      });
    },
    [onChange, activeCount],
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || disabled) return;
      const files = Array.from(fileList);
      void files.reduce(
        (chain, file) => chain.then(() => uploadFile(file)),
        Promise.resolve(),
      );
    },
    [disabled, uploadFile],
  );

  async function removeAttachment(item: WebsiteReviewPendingAttachment) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);

    if (item.id != null && item.status === "ready") {
      try {
        await fetch(`/api/portal/website-review/upload?id=${item.id}`, { method: "DELETE" });
      } catch {
        // Still remove from UI
      }
    }

    onChange((prev) => prev.filter((a) => a.localId !== item.localId));
    setZoneError(null);
  }

  const canAddMore = readyCount < WEBSITE_REVIEW_MAX_ATTACHMENTS && !uploading && !disabled;

  return (
    <CesField
      label={PORTAL_CLIENT_LANGUAGE.attachmentLabel}
      htmlFor={inputId}
      optional
      hint={PORTAL_CLIENT_LANGUAGE.attachmentHint}
      error={zoneError ?? undefined}
    >
      <div
        className={`kxd-ces-upload${dragActive ? " kxd-ces-upload--active" : ""}${!canAddMore ? " kxd-ces-upload--disabled" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (canAddMore) setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (canAddMore) setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.currentTarget === e.target) setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
          if (canAddMore) handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="kxd-ces-upload__input"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          disabled={!canAddMore}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="kxd-ces-upload__body">
          <p className="kxd-ces-upload__title">{PORTAL_CLIENT_LANGUAGE.attachmentDropTitle}</p>
          <p className="kxd-ces-upload__lead">{PORTAL_CLIENT_LANGUAGE.attachmentDropLead}</p>
          <button
            type="button"
            className="kxd-ces-btn kxd-ces-btn--ghost kxd-ces-upload__browse"
            disabled={!canAddMore}
            onClick={() => inputRef.current?.click()}
          >
            Browse files
          </button>
        </div>
      </div>

      {attachments.length > 0 ? (
        <ul className="kxd-ces-upload-list" aria-live="polite">
          {attachments.map((item) => (
            <li key={item.localId} className="kxd-ces-upload-item">
              {item.isImage && item.previewUrl && item.status !== "error" ? (
                <div className="kxd-ces-upload-item__thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt="" />
                </div>
              ) : (
                <div className="kxd-ces-upload-item__chip" aria-hidden>
                  {fileIconLabel(item.mimeType)}
                </div>
              )}

              <div className="kxd-ces-upload-item__meta">
                <span className="kxd-ces-upload-item__name">{item.filename}</span>
                <span className="kxd-ces-upload-item__size">
                  {formatAttachmentSize(item.filesize)}
                  {item.status === "uploading" ? " · Uploading…" : null}
                  {item.status === "error" ? ` · ${item.error}` : null}
                </span>
                {item.status === "uploading" ? (
                  <div
                    className="kxd-ces-upload-item__progress"
                    role="progressbar"
                    aria-valuenow={item.progress ?? 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${item.progress ?? 12}%` }} />
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className="kxd-ces-upload-item__remove"
                disabled={disabled || item.status === "uploading"}
                aria-label={`Remove ${item.filename}`}
                onClick={() => void removeAttachment(item)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </CesField>
  );
}
