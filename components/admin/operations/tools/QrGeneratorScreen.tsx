"use client";

import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type FormEvent,
} from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  KxdButton,
  KxdField,
  KxdInput,
  KxdPage,
  KxdSection,
  KxdSurface,
} from "@/components/os";
import {
  QR_DEFAULTS,
  buildQrFilenameBase,
  clearQrHistory,
  getQrHistoryServerSnapshot,
  getQrHistorySnapshot,
  parseQrHistorySnapshot,
  pushQrHistory,
  renderQrPngDataUrl,
  renderQrSvg,
  subscribeQrHistory,
  validateQrUrl,
} from "@/lib/tools/qr-generator";

function downloadTextFile(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

function downloadDataUrl(filename: string, dataUrl: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

async function copyPngFromDataUrl(dataUrl: string): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined")
      return false;
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    return true;
  } catch {
    return false;
  }
}

export function QrGeneratorScreen() {
  const formId = useId();
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [encodedUrl, setEncodedUrl] = useState<string | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [size, setSize] = useState<number>(QR_DEFAULTS.size);
  const [margin, setMargin] = useState<number>(QR_DEFAULTS.margin);
  const [foreground, setForeground] = useState<string>(QR_DEFAULTS.foreground);
  const [background, setBackground] = useState<string>(QR_DEFAULTS.background);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const generationRef = useRef(0);
  const historySnapshot = useSyncExternalStore(
    subscribeQrHistory,
    getQrHistorySnapshot,
    getQrHistoryServerSnapshot,
  );
  const history = parseQrHistorySnapshot(historySnapshot);

  function resetDefaults() {
    setSize(QR_DEFAULTS.size);
    setMargin(QR_DEFAULTS.margin);
    setForeground(QR_DEFAULTS.foreground);
    setBackground(QR_DEFAULTS.background);
    setStatusMessage(
      "Defaults restored. Generate again to refresh the preview.",
    );
  }

  function generateFrom(raw: string) {
    const validated = validateQrUrl(raw);
    if (!validated.ok) {
      setError(validated.error);
      setEncodedUrl(null);
      setPreviewDataUrl(null);
      setSvgMarkup(null);
      return;
    }

    setError(null);
    setInputValue(validated.url);
    const token = ++generationRef.current;

    startTransition(async () => {
      try {
        const options = {
          exactUrl: validated.url,
          size,
          margin,
          foreground,
          background,
        };
        const [png, svg] = await Promise.all([
          renderQrPngDataUrl(options),
          renderQrSvg(options),
        ]);
        if (token !== generationRef.current) return;
        setEncodedUrl(validated.url);
        setPreviewDataUrl(png);
        setSvgMarkup(svg);
        pushQrHistory(validated.url);
        setStatusMessage("QR ready — encoded value confirmed below.");
      } catch {
        if (token !== generationRef.current) return;
        setError("Could not generate the QR code. Try again.");
        setEncodedUrl(null);
        setPreviewDataUrl(null);
        setSvgMarkup(null);
      }
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    generateFrom(inputValue);
  }

  const filenameBase = encodedUrl ? buildQrFilenameBase(encodedUrl) : "kxd-qr";

  return (
    <OperationsShell activeId="tools">
      <KxdPage className="kxd-os-page--ops kxd-os-tools-qr">
        <OperationsPageHero
          eyebrow="KXD OS · Tools"
          title="QR Generator"
          lead="Encode exact absolute URLs client-side — no shorteners, redirects, or tracking wrappers."
        />

        <div className="kxd-os-tools-qr__layout">
          <KxdSection label="URL" className="kxd-os-operations-section">
            <KxdSurface variant="glass" className="kxd-os-tools-qr__panel">
              <form
                id={formId}
                onSubmit={handleSubmit}
                className="kxd-os-tools-qr__form"
                noValidate
              >
                <KxdField label="Absolute URL">
                  <KxdInput
                    id={`${formId}-url`}
                    name="url"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    placeholder="https://kreatebydesign.com/contact"
                    value={inputValue}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={
                      error
                        ? `${formId}-error`
                        : encodedUrl
                          ? `${formId}-encoded`
                          : undefined
                    }
                    onChange={(event) => {
                      setInputValue(event.target.value);
                      setError(null);
                    }}
                  />
                </KxdField>

                {error ? (
                  <p
                    id={`${formId}-error`}
                    className="kxd-os-tools-qr__error"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}

                <div className="kxd-os-tools-qr__controls">
                  <KxdField label={`Output size (${size}px)`}>
                    <input
                      className="kxd-os-input"
                      type="range"
                      min={256}
                      max={1024}
                      step={32}
                      value={size}
                      aria-valuetext={`${size} pixels`}
                      onChange={(event) => setSize(Number(event.target.value))}
                    />
                  </KxdField>
                  <KxdField label={`Quiet zone (${margin} modules)`}>
                    <input
                      className="kxd-os-input"
                      type="range"
                      min={0}
                      max={8}
                      step={1}
                      value={margin}
                      aria-valuetext={`${margin} modules`}
                      onChange={(event) =>
                        setMargin(Number(event.target.value))
                      }
                    />
                  </KxdField>
                  <KxdField label="Foreground">
                    <input
                      className="kxd-os-input kxd-os-tools-qr__color"
                      type="color"
                      value={foreground}
                      aria-label="Foreground color"
                      onChange={(event) => setForeground(event.target.value)}
                    />
                  </KxdField>
                  <KxdField label="Background">
                    <input
                      className="kxd-os-input kxd-os-tools-qr__color"
                      type="color"
                      value={background}
                      aria-label="Background color"
                      onChange={(event) => setBackground(event.target.value)}
                    />
                  </KxdField>
                </div>

                <div className="kxd-os-tools-qr__actions">
                  <KxdButton type="submit" loading={pending}>
                    {encodedUrl ? "Update QR" : "Generate QR"}
                  </KxdButton>
                  <KxdButton
                    type="button"
                    variant="secondary"
                    onClick={resetDefaults}
                  >
                    Reset defaults
                  </KxdButton>
                </div>
              </form>
            </KxdSurface>
          </KxdSection>

          <KxdSection label="Preview" className="kxd-os-operations-section">
            <KxdSurface variant="glass" className="kxd-os-tools-qr__panel">
              <div className="kxd-os-tools-qr__preview-wrap">
                {previewDataUrl && encodedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewDataUrl}
                    alt={`QR code encoding ${encodedUrl}`}
                    className="kxd-os-tools-qr__preview"
                    width={size}
                    height={size}
                  />
                ) : (
                  <p className="kxd-os-meta kxd-os-tools-qr__preview-empty">
                    Enter an absolute http(s) URL and generate a preview.
                  </p>
                )}
              </div>

              {encodedUrl ? (
                <div
                  id={`${formId}-encoded`}
                  className="kxd-os-tools-qr__encoded"
                >
                  <p className="kxd-os-metric__label">Exact value encoded</p>
                  <p className="kxd-os-tools-qr__encoded-value">{encodedUrl}</p>
                </div>
              ) : null}

              {statusMessage ? (
                <p className="kxd-os-meta">{statusMessage}</p>
              ) : null}

              <div className="kxd-os-tools-qr__actions">
                <KxdButton
                  type="button"
                  variant="secondary"
                  disabled={!encodedUrl}
                  onClick={async () => {
                    if (!encodedUrl) return;
                    const ok = await copyText(encodedUrl);
                    setStatusMessage(
                      ok ? "Encoded URL copied." : "Could not copy URL.",
                    );
                  }}
                >
                  Copy URL
                </KxdButton>
                <KxdButton
                  type="button"
                  variant="secondary"
                  disabled={!previewDataUrl}
                  onClick={async () => {
                    if (!previewDataUrl) return;
                    const ok = await copyPngFromDataUrl(previewDataUrl);
                    setStatusMessage(
                      ok
                        ? "QR image copied."
                        : "Image copy is not supported in this browser — download PNG instead.",
                    );
                  }}
                >
                  Copy image
                </KxdButton>
                <KxdButton
                  type="button"
                  variant="secondary"
                  disabled={!previewDataUrl}
                  onClick={() => {
                    if (!previewDataUrl) return;
                    downloadDataUrl(`${filenameBase}.png`, previewDataUrl);
                    setStatusMessage(`Downloaded ${filenameBase}.png`);
                  }}
                >
                  Download PNG
                </KxdButton>
                <KxdButton
                  type="button"
                  variant="secondary"
                  disabled={!svgMarkup}
                  onClick={() => {
                    if (!svgMarkup) return;
                    downloadTextFile(
                      `${filenameBase}.svg`,
                      svgMarkup,
                      "image/svg+xml",
                    );
                    setStatusMessage(`Downloaded ${filenameBase}.svg`);
                  }}
                >
                  Download SVG
                </KxdButton>
              </div>
            </KxdSurface>
          </KxdSection>
        </div>

        <KxdSection
          label="Recent (this browser)"
          className="kxd-os-operations-section"
        >
          <KxdSurface variant="glass" className="kxd-os-tools-qr__panel">
            {history.length === 0 ? (
              <p className="kxd-os-meta">
                No recent URLs yet. Generated links stay on this device only.
              </p>
            ) : (
              <>
                <ul className="kxd-os-tools-qr__history">
                  {history.map((entry) => (
                    <li key={`${entry.createdAt}-${entry.url}`}>
                      <button
                        type="button"
                        className="kxd-os-tools-qr__history-btn"
                        onClick={() => {
                          setInputValue(entry.url);
                          generateFrom(entry.url);
                        }}
                      >
                        {entry.url}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="kxd-os-tools-qr__actions">
                  <KxdButton
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      clearQrHistory();
                      setStatusMessage("Recent history cleared.");
                    }}
                  >
                    Clear history
                  </KxdButton>
                </div>
              </>
            )}
          </KxdSurface>
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
