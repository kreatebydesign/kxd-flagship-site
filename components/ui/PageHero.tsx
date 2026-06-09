import Link from "next/link";
import { cn } from "@/lib/utils";
import { GoldAtmosphere } from "@/components/ui/surfaces/GoldAtmosphere";

type PageHeroProps = {
  label: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
};

export function PageHero({ label, title, description, children, className }: PageHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-[var(--kxd-border-white)] bg-[var(--kxd-black-deep)] py-24 lg:py-32",
        className,
      )}
    >
      <GoldAtmosphere />
      <div className="kxd-container relative">
        <p className="kxd-eyebrow">{label}</p>
        <h1 className="kxd-serif-title mt-5 max-w-4xl text-[clamp(2rem,4vw,3rem)]">{title}</h1>
        <p className="kxd-body mt-6 max-w-2xl">{description}</p>
        {children}
      </div>
    </section>
  );
}

export function PagePlaceholder({ message }: { message: string }) {
  return (
    <section className="kxd-section bg-[var(--kxd-black-base)]">
      <div className="kxd-container">
        <div className="kxd-luxury-form max-w-2xl p-8">
          <p className="kxd-body">{message}</p>
          <Link
            href="/contact"
            className="kxd-button-label mt-6 inline-flex text-[var(--kxd-gold)] transition hover:text-[var(--kxd-gold-light)]"
          >
            Start a conversation →
          </Link>
        </div>
      </div>
    </section>
  );
}
