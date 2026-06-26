import Image from "next/image";
import Link from "next/link";

type KxdLogoProps = {
  className?: string;
  width?: number;
  height?: number;
  /** Pass true when KxdLogo is already inside an anchor element to prevent nested <a> hydration errors. */
  disableLink?: boolean;
};

export function KxdLogo({ className, width = 56, height = 40, disableLink = false }: KxdLogoProps) {
  const img = (
    <Image
      src="/migrated-assets/brand/kxd-logo-transparent.png"
      alt="KXD"
      width={width}
      height={height}
      className="h-auto w-[3.5rem] object-contain"
      priority
      fetchPriority="high"
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
