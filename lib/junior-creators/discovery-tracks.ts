/**
 * KXD Academy discovery tracks — youth edition teaching content.
 * Website Detective, Brand Spotter, Opportunity Hunter.
 */

export type DiscoveryTopic = {
  title: string;
  description: string;
  example: string;
};

export type DiscoveryTrack = {
  id: "opportunity-hunter" | "website-detective" | "brand-spotter";
  title: string;
  tagline: string;
  topics: DiscoveryTopic[];
};

export const DISCOVERY_TRACKS: DiscoveryTrack[] = [
  {
    id: "opportunity-hunter",
    title: "Opportunity Hunter",
    tagline: "Learn what makes a great discovery — and what KXD can actually help with.",
    topics: [
      {
        title: "What makes a good discovery",
        description: "A strong find is a real business with a clear problem KXD knows how to solve — not a random listing.",
        example: "A local gym with a broken mobile site and no online booking is a great discovery. A closed shop with no website is not.",
      },
      {
        title: "What KXD can help with",
        description: "Websites, branding, SEO, and growth systems — premium work for businesses that care about quality.",
        example: "A salon with beautiful work but a cheap-looking website might need a full website experience, not just a logo tweak.",
      },
      {
        title: "Warning signs",
        description: "Some businesses aren't a fit — and that's okay. Learning to spot them saves everyone time.",
        example: "No clear owner, obviously no budget signals, or a business that already looks world-class online.",
      },
      {
        title: "Good signs",
        description: "Real business, real customers, and a gap between how good they are and how they show up online.",
        example: "Busy restaurant, great reviews, but their website hasn't been updated in five years.",
      },
    ],
  },
  {
    id: "website-detective",
    title: "Website Detective",
    tagline: "Train your eye to spot what's broken, missing, or holding a business back online.",
    topics: [
      {
        title: "Homepage problems",
        description: "The homepage should instantly tell you who they are, what they do, and what to do next.",
        example: "Cluttered layout, tiny text, or you can't figure out what the business actually sells within 5 seconds.",
      },
      {
        title: "Missing calls-to-action",
        description: "Every good site makes it obvious how to get in touch, book, or buy.",
        example: "No contact button, phone number buried in the footer, or 'Submit' on a form that goes nowhere.",
      },
      {
        title: "Bad mobile design",
        description: "Most people browse on phones. If the site is painful on mobile, the business is losing customers.",
        example: "Text too small to read, buttons you can't tap, or horizontal scrolling on your phone.",
      },
      {
        title: "Trust issues",
        description: "People decide fast whether a business feels legit. Photography, copy, and consistency all matter.",
        example: "Stock photos that don't match the business, broken images, or copy with spelling mistakes everywhere.",
      },
    ],
  },
  {
    id: "brand-spotter",
    title: "Brand Spotter",
    tagline: "See branding the way a creative studio does — logos, colors, and consistency.",
    topics: [
      {
        title: "Strong logos",
        description: "A strong logo is clear, memorable, and used consistently everywhere the business shows up.",
        example: "Clean mark, readable at small sizes, same logo on the website, social media, and storefront.",
      },
      {
        title: "Weak logos",
        description: "Weak logos are blurry, stretched, outdated, or different on every platform.",
        example: "Pixelated logo in the header, a different logo on Instagram, and clipart from 2009 on the homepage.",
      },
      {
        title: "Consistent branding",
        description: "Premium brands use the same colors, fonts, and tone across everything.",
        example: "Same gold accent, same font family, and photos that feel like one studio shot them.",
      },
      {
        title: "Color recognition",
        description: "Colors set mood and trust. Random colors usually mean no real brand system exists.",
        example: "Five different blues on one page, or neon colors that clash with a luxury service business.",
      },
    ],
  },
];
