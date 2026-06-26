export const SITE = {
  name: "Kreate by Design",
  shortName: "KXD",
  tagline:
    "Luxury digital experiences, growth infrastructure, and operational systems.",
  description:
    "Kreate by Design — luxury websites, growth infrastructure, and operational platforms. Los Angeles, California. Built with discipline.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.kreatebydesign.com",
  locale: "en_US",
  email: "matt@kreatebydesign.com",
  phone: "",
  location: "Los Angeles, California",
  address: {
    streetAddress: "",
    addressLocality: "Los Angeles",
    addressRegion: "CA",
    postalCode: "",
    addressCountry: "US",
  },
  social: {
    linkedin: "https://www.linkedin.com/company/kreate-by-design",
    instagram: "https://www.instagram.com/kreatebydesign",
  },
  foundedYear: 2020,
} as const;

export const HEADER_NAV = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/work" },
  { label: "About Us", href: "/about" },
] as const;

export const INQUIRY_EMAIL =
  process.env.KXD_INQUIRY_EMAIL || "matt@kreatebydesign.com";

export const SERVICE_OPTIONS = [
  {
    label: "Luxury Website Experiences",
    value: "luxury-website-experiences",
    slug: "luxury-website-experiences",
  },
  {
    label: "Brand Systems & Identity",
    value: "brand-systems-identity",
    slug: "brand-systems-identity",
  },
  {
    label: "Growth Infrastructure",
    value: "growth-infrastructure",
    slug: "growth-infrastructure",
  },
  {
    label: "Enterprise Platforms & Operational Systems",
    value: "enterprise-platforms",
    slug: "enterprise-platforms",
  },
] as const;

export const BUDGET_OPTIONS = [
  { label: "Under $5,000", value: "under-5k" },
  { label: "$5,000 – $10,000", value: "5k-10k" },
  { label: "$10,000 – $25,000", value: "10k-25k" },
  { label: "$25,000+", value: "25k-plus" },
] as const;

export const TIMELINE_OPTIONS = [
  { label: "Immediately", value: "immediate" },
  { label: "Within 30 Days", value: "within-30-days" },
  { label: "Within 60–90 Days", value: "60-90-days" },
  { label: "Exploring Options", value: "exploring" },
] as const;