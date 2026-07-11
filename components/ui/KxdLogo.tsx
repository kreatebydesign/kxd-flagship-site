import Image from "next/image";
import Link from "next/link";

type KxdLogoProps = {
  className?: string;
  width?: number;
  height?: number;
  /** Pass true when KxdLogo is already inside an anchor element to prevent nested <a> hydration errors. */
  disableLink?: boolean;
};

/**
 * Public/marketing brand mark — links to `/`.
 * Authenticated KXD OS surfaces must use `KxdOsLogo` (Executive Home), not this component.
 */
export function KxdLogo({ className, width = 56, height = 40, disableLink = false }: KxdLogoProps) {
  const img = (
    <Image
      src="/migrated-assets/brand/kxd-logo-transparent.png"
      alt="KXD"
      width={width}
      height={height}
      className="h-auto w-[3.5rem] object-contain"
      loading="eager"
    />
  );

  if (disableLink) {
    return <span className={className}>{img}</span>;
  }

  return (
    <Link href="/" className={className} aria-label="Kreate by Design home">
      {img}
    </Link>
  );
}
