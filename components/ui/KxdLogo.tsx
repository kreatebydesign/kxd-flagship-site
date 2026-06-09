import Image from "next/image";
import Link from "next/link";

type KxdLogoProps = {
  className?: string;
  width?: number;
  height?: number;
};

export function KxdLogo({ className, width = 56, height = 40 }: KxdLogoProps) {
  return (
    <Link href="/" className={className} aria-label="Kreate by Design home">
      <Image
        src="/migrated-assets/brand/kxd-logo-transparent.png"
        alt="KXD"
        width={width}
        height={height}
        className="h-auto w-[3.5rem] object-contain"
        priority
      />
    </Link>
  );
}
