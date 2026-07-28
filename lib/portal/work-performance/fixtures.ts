/**
 * Future access matrix fixtures — Batch D verification only.
 * Slug-based, no database IDs, no emails as authorization, no production records.
 *
 * Billy → Cusick Morgan Motorsports
 * Nicole → OTP, OTP Carts
 * Don → Cusick Morgan Motorsports, OTP, OTP Carts, 2475 Townsgate
 */

export type FutureAccessPersona = "billy" | "nicole" | "don";

export type FutureAccessAccountSlug =
  | "cusick-morgan-motorsports"
  | "otp"
  | "otp-carts"
  | "2475-townsgate";

export type FutureAccessPersonaFixture = {
  persona: FutureAccessPersona;
  /** Display label for reports — not used as authorization. */
  label: string;
  authorizedSlugs: FutureAccessAccountSlug[];
  expectsSwitcher: boolean;
  expectsMultiSiteOverview: boolean;
};

export const FUTURE_ACCESS_MATRIX: Record<FutureAccessPersona, FutureAccessPersonaFixture> =
  {
    billy: {
      persona: "billy",
      label: "Billy",
      authorizedSlugs: ["cusick-morgan-motorsports"],
      expectsSwitcher: false,
      expectsMultiSiteOverview: false,
    },
    nicole: {
      persona: "nicole",
      label: "Nicole",
      authorizedSlugs: ["otp", "otp-carts"],
      expectsSwitcher: true,
      expectsMultiSiteOverview: true,
    },
    don: {
      persona: "don",
      label: "Don",
      authorizedSlugs: [
        "cusick-morgan-motorsports",
        "otp",
        "otp-carts",
        "2475-townsgate",
      ],
      expectsSwitcher: true,
      expectsMultiSiteOverview: true,
    },
  };

export const FUTURE_ACCESS_ACCOUNT_LABELS: Record<FutureAccessAccountSlug, string> = {
  "cusick-morgan-motorsports": "Cusick Morgan Motorsports",
  otp: "OTP",
  "otp-carts": "OTP Carts",
  "2475-townsgate": "2475 Townsgate",
};

/** Deterministic fixture client IDs — test-only, never production mappings. */
export const FUTURE_ACCESS_FIXTURE_CLIENT_IDS: Record<FutureAccessAccountSlug, number> = {
  "cusick-morgan-motorsports": 9001,
  otp: 9002,
  "otp-carts": 9003,
  "2475-townsgate": 9004,
};

export function authorizedFixtureClientIds(
  persona: FutureAccessPersona,
): number[] {
  return FUTURE_ACCESS_MATRIX[persona].authorizedSlugs.map(
    (slug) => FUTURE_ACCESS_FIXTURE_CLIENT_IDS[slug],
  );
}

export function isSlugAuthorizedForPersona(
  persona: FutureAccessPersona,
  slug: FutureAccessAccountSlug,
): boolean {
  return FUTURE_ACCESS_MATRIX[persona].authorizedSlugs.includes(slug);
}
