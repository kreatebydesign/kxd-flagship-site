import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type EditorialWorkFrameProps = {
  src: string;
  alt: string;
  href?: string;
  label?: string;
  role?: string;
  objectPosition?: string;
  aspectClass?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  reveal?: boolean;
  showOverlayLabel?: boolean;
};

/**
 * Editorial work frame — premium crop, consistent border, subtle hover.
 * Server component; no client JavaScript.
 */
export function EditorialWorkFrame({
  src,
  alt,
  href,
  label,
  role,
  objectPosition = "top",
  aspectClass = "aspect-[16/10]",
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  className,
  reveal = false,
  showOverlayLabel = true,
}: EditorialWorkFrameProps) {
  const frame = (
    <div
      className={cn(
        "kxd-editorial-frame group relative overflow-hidden",
        aspectClass,
        reveal && "kxd-reveal",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        sizes={sizes}
        className="kxd-editorial-frame__image object-cover transition-transform duration-[800ms] ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:scale-[1.02]"
        style={{ objectPosition }}
      />
      <div className="kxd-editorial-frame__shade" aria-hidden />
      {showOverlayLabel && (role || label) ? (
        <div className="kxd-editorial-frame__meta">
          {role ? (
            <p className="kxd-editorial-frame__role">{role}</p>
          ) : null}
          {label ? (
            <p className="kxd-editorial-frame__label kxd-label">{label}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block" aria-label={alt}>
        {frame}
      </Link>
    );
  }

  return frame;
}
