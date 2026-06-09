type ServiceIconProps = {
  type: "layers" | "shapes" | "chart" | "grid";
  className?: string;
};

export function ServiceIcon({ type, className }: ServiceIconProps) {
  const stroke = "rgba(201, 169, 98, 0.9)";

  return (
    <div
      className={`flex h-10 w-10 items-center justify-center border border-[rgba(201,169,98,0.25)] ${className ?? ""}`}
      aria-hidden
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        {type === "layers" && (
          <>
            <rect x="2" y="10" width="16" height="3" stroke={stroke} strokeWidth="1" />
            <rect x="4" y="6" width="12" height="3" stroke={stroke} strokeWidth="1" />
            <rect x="6" y="2" width="8" height="3" stroke={stroke} strokeWidth="1" />
          </>
        )}
        {type === "shapes" && (
          <>
            <circle cx="7" cy="10" r="4" stroke={stroke} strokeWidth="1" />
            <rect x="10" y="6" width="7" height="7" stroke={stroke} strokeWidth="1" />
          </>
        )}
        {type === "chart" && (
          <path
            d="M3 15L8 9L12 12L17 5"
            stroke={stroke}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {type === "grid" && (
          <>
            <rect x="3" y="3" width="6" height="6" stroke={stroke} strokeWidth="1" />
            <rect x="11" y="3" width="6" height="6" stroke={stroke} strokeWidth="1" />
            <rect x="3" y="11" width="6" height="6" stroke={stroke} strokeWidth="1" />
            <rect x="11" y="11" width="6" height="6" stroke={stroke} strokeWidth="1" />
          </>
        )}
      </svg>
    </div>
  );
}
