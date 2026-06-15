/**
 * Client logo grid — 18 logos, 3 rows × 6 columns.
 *
 * size   — optional base-height tier (md/lg/xl/2xl) for logos that need a
 *          taller rendering canvas.
 * scale  — optional CSS transform scale applied at render time.
 *          Combined with overflow:hidden on the cell this acts as a zoom:
 *          the image renders larger while transparent padding is clipped at
 *          the cell boundary, making the actual artwork fill more visual
 *          space without breaking the grid layout.
 */
type LogoSize = "md" | "lg" | "xl" | "2xl";

type ClientLogo = {
  name: string;
  src: string;
  size?: LogoSize;
  scale?: number;
};

export const CLIENT_LOGOS: ClientLogo[] = [
  // ── Row 1 ──────────────────────────────────────────────────────────────────
  { name: "Primal Motorsports",              src: "/migrated-assets/logos/primal.svg" },
  { name: "Cusick Morgan Motorsports",       src: "/migrated-assets/logos/cusick-morgan.svg" },
  { name: "Plate The Umpqua",               src: "/migrated-assets/logos/plate-the-umpqua.svg",            scale: 1.65 },
  { name: "SBE",                             src: "/migrated-assets/logos/sbe.svg" },
  { name: "OTP",                             src: "/migrated-assets/logos/otp.svg" },
  { name: "Dialed In Electric",              src: "/migrated-assets/logos/dialed-in-electric.svg",          scale: 1.45 },

  // ── Row 2 ──────────────────────────────────────────────────────────────────
  { name: "Democratic Club of Greater Tracy",src: "/migrated-assets/logos/the-democratic.svg",             scale: 1.45 },
  { name: "Golden State Warriors",           src: "/migrated-assets/logos/golden-state.svg",               scale: 1.50 },
  { name: "Bobby Q",                         src: "/migrated-assets/logos/bobby-q.svg" },
  { name: "Hair Mafia",                      src: "/migrated-assets/logos/hair-mafia.svg",                 scale: 1.50 },
  { name: "Spur Restaurant & Bar",           src: "/migrated-assets/logos/spur-logo.svg" },
  { name: "Martinsen Construction",          src: "/migrated-assets/logos/martinsen-construction-logo.svg", scale: 1.65 },

  // ── Row 3 ──────────────────────────────────────────────────────────────────
  { name: "La Lola",                         src: "/migrated-assets/logos/lalola.svg",                     scale: 1.50 },
  { name: "10 Summers",                      src: "/migrated-assets/logos/10-summer.svg",                  scale: 1.45 },
  { name: "Gaya Palmer",                     src: "/migrated-assets/logos/gaya-palmer.svg" },
  { name: "SHVO",                            src: "/migrated-assets/logos/shvo.svg" },
  { name: "AutoDV8ions",                     src: "/migrated-assets/logos/dv8.svg" },
  { name: "James Kali Financial",            src: "/migrated-assets/logos/james-kali.svg",                 scale: 1.35 },
];
