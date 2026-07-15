"use client";

import { useCallback, useEffect, useState } from "react";

type Image = { url: string; alt: string };

type Props = {
  images: Image[];
  title: string;
};

export function ShowroomGallery({ images, title }: Props) {
  const [active, setActive] = useState(0);
  const safeImages = images.length > 0 ? images : [];

  const go = useCallback(
    (delta: number) => {
      if (safeImages.length === 0) return;
      setActive((prev) => (prev + delta + safeImages.length) % safeImages.length);
    },
    [safeImages.length],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (safeImages.length === 0) {
    return (
      <div className="kxd-showroom-gallery kxd-showroom-gallery--empty">
        <p>Photography arriving soon</p>
      </div>
    );
  }

  const current = safeImages[active] ?? safeImages[0];

  return (
    <div className="kxd-showroom-gallery">
      <figure className="kxd-showroom-gallery__stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={current.alt || title} />
        {safeImages.length > 1 ? (
          <div className="kxd-showroom-gallery__nav">
            <button type="button" aria-label="Previous image" onClick={() => go(-1)}>
              ←
            </button>
            <span aria-live="polite">
              {active + 1} / {safeImages.length}
            </span>
            <button type="button" aria-label="Next image" onClick={() => go(1)}>
              →
            </button>
          </div>
        ) : null}
      </figure>
      {safeImages.length > 1 ? (
        <ul className="kxd-showroom-gallery__thumbs" aria-label="Gallery thumbnails">
          {safeImages.map((image, index) => (
            <li key={`${image.url}-${index}`}>
              <button
                type="button"
                className={
                  index === active
                    ? "kxd-showroom-gallery__thumb is-active"
                    : "kxd-showroom-gallery__thumb"
                }
                aria-label={`View image ${index + 1}`}
                aria-current={index === active ? "true" : undefined}
                onClick={() => setActive(index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
