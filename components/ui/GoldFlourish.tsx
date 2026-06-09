export function GoldFlourish({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <div className="flex items-center justify-center gap-4">
        <span className="h-px w-12 bg-gradient-to-r from-transparent to-[rgba(201,169,98,0.5)] sm:w-16" />
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M5 0L6.12 3.88L10 5L6.12 6.12L5 10L3.88 6.12L0 5L3.88 3.88L5 0Z"
            fill="rgba(201, 169, 98, 0.85)"
          />
        </svg>
        <span className="h-px w-12 bg-gradient-to-l from-transparent to-[rgba(201,169,98,0.5)] sm:w-16" />
      </div>
    </div>
  );
}
