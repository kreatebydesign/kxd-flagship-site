/**
 * Homepage hero work reel — curated proof of KXD's range.
 *
 * Rules:
 * - Viewport-scale crops only (hero.webp, homepage-02.webp, desktop-home.png)
 * - No full-page scroll captures (homepage-full.webp looks compressed in the strip)
 * - One frame per project — no repeats before cycling
 * - Ordered for industry variety: motorsports, construction, hospitality, beauty, automotive, trades
 */

export type WorkReelFrame = {
  src: string;
  alt: string;
  objectPosition?: string;
};

export const WORK_REEL_FRAMES: WorkReelFrame[] = [
  {
    // Primal Motorsports — motorsports flagship
    src: "/migrated-assets/case-studies/primal-motorsports/hero.webp",
    alt: "Primal Motorsports",
    objectPosition: "top center",
  },
  {
    // Martinsen Construction — contractor website
    src: "/images/work/screenshots/martinsen-construction/desktop-home.png",
    alt: "Martinsen Construction",
    objectPosition: "top center",
  },
  {
    // Plate the Umpqua — regional hospitality/dining
    src: "/migrated-assets/case-studies/plate-the-umpqua/hero.webp",
    alt: "Plate the Umpqua",
    objectPosition: "top center",
  },
  {
    // Hair Mafia Salon — beauty / lifestyle
    src: "/migrated-assets/case-studies/hair-mafia/hero.webp",
    alt: "Hair Mafia Salon",
    objectPosition: "top center",
  },
  {
    // Cusick Morgan Motorsports — racing team
    src: "/migrated-assets/case-studies/cusick-morgan-motorsports/hero.webp",
    alt: "Cusick Morgan Motorsports",
    objectPosition: "top center",
  },
  {
    // La Cocina — family restaurant
    src: "/images/work/screenshots/la-cocina/desktop-home.png",
    alt: "La Cocina",
    objectPosition: "top center",
  },
  {
    // AutoDV8ions — boutique automotive studio
    src: "/migrated-assets/case-studies/autodv8ions/hero.webp",
    alt: "AutoDV8ions",
    objectPosition: "top center",
  },
  {
    // Spur Restaurant & Bar — hospitality/bar
    src: "/migrated-assets/case-studies/spur-restaurant/homepage-02.webp",
    alt: "Spur Restaurant & Bar",
    objectPosition: "top center",
  },
  {
    // E. Davis Enterprises — energy/trades
    src: "/images/work/screenshots/e-davis-enterprises/desktop-home.png",
    alt: "E. Davis Enterprises",
    objectPosition: "top center",
  },
  {
    // SBE / Hyde Lounge — premium nightlife
    src: "/images/work/screenshots/sbe-hyde-lounge/clean-hero.png",
    alt: "SBE / Hyde Lounge",
    objectPosition: "top center",
  },
];
