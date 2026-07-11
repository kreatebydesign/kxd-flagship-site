import Link from "next/link";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { KXD_OS_HOME } from "@/lib/admin/os-home";

type KxdOsLogoProps = {
  className?: string;
  width?: number;
  height?: number;
};

/**
 * Authenticated KXD OS brand mark.
 * Always returns to Executive Home — never the public marketing site.
 */
export function KxdOsLogo({ className, width, height = 18 }: KxdOsLogoProps) {
  return (
    <Link href={KXD_OS_HOME} className={className} aria-label="KXD OS">
      <KxdLogo width={width} height={height} disableLink />
    </Link>
  );
}
