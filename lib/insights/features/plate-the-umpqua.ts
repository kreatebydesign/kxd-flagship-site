import { JOURNAL_AUTHOR } from "@/lib/insights";
import type { JournalFeatureArticle } from "@/lib/insights/journal-blocks";

export const PLATE_THE_UMPQUA_FEATURE: JournalFeatureArticle = {
  slug: "building-plate-the-umpqua-with-chef-martin",
  title:
    "I Thought I Was Building Martin a Website. We Ended Up Building Plate OS.",
  excerpt:
    "What started as a private dining website turned into something much bigger. Here’s how Martin and I built the site, the admin, the business logic and eventually an operating system around the way Plate the Umpqua actually works.",
  seoTitle: "How We Built Plate OS for Plate the Umpqua",
  seoDescription:
    "Inside the Plate the Umpqua build with Chef Martin Condon: private dining website, custom Plate OS admin, Welcome Home partner gifting, Square checkout, and the infrastructure under the site.",
  category: "operational-systems",
  categoryLabel: "Operational Systems",
  editorialLabel: "Build Story",
  subjectLabel: "Plate the Umpqua",
  author: JOURNAL_AUTHOR,
  publishedAt: "2026-09-12",
  readingTime: 16,
  featured: true,
  keywords: [
    "Plate the Umpqua",
    "Plate OS",
    "private dining website development",
    "private chef website design",
    "hospitality website development",
    "custom hospitality admin systems",
    "business operations software",
    "Welcome Home Private Dining",
    "Partner Concierge",
    "Chef Martin Condon",
  ],
  heroImage: {
    src: "/journal/plate-the-umpqua/hero.webp",
    alt: "Plate the Umpqua private dining hospitality experience",
  },
  ogImage: "/journal/plate-the-umpqua/og-card.jpg",
  aboutTopics: [
    "Plate the Umpqua",
    "private dining website development",
    "hospitality website development",
    "custom hospitality admin systems",
    "business operations software",
  ],
  showCta: false,
  blocks: [
    {
      type: "prose",
      paragraphs: [
        "I thought I was building Martin a website.",
        "Chef Martin Condon runs Plate the Umpqua out of Roseburg and the Umpqua Valley. Private dining. Estate dinners. Wine country evenings. The kind of hospitality that lives or dies in the room, not on a homepage.",
        "The initial brief was familiar enough. Get the work online. Make it feel like the evenings actually feel. Give people a clean way to inquire. Build something that doesn’t look like every other restaurant template with a contact form glued on.",
        "We did that. [platetheumpqua.com](https://platetheumpqua.com) is live. Dark editorial surface. Real photography and video. Pages for experiences, packages, concierge, the valley. It reads like hospitality.",
        "But if you only look at the public site, you’re missing most of what we built.",
        "Martin and I kept talking through how the business actually runs. Inquiries. Follow-up. Menus. Events. Invoices. Partner gifts for Realtors and other professionals. Print certificates. Payment. What happens after dinner. And the project kept growing because the business kept needing more than a brochure.",
        "We ended up building Plate OS.",
      ],
    },
    {
      type: "figure",
      src: "/journal/plate-the-umpqua/live-homepage.webp",
      alt: "Plate the Umpqua public homepage",
      caption: "Live public homepage — hospitality first. The operating system sits underneath.",
      layout: "wide",
    },
    {
      type: "heading",
      text: "Martin’s side. My side.",
    },
    {
      type: "prose",
      paragraphs: [
        "Martin understands private dining in a way I never will. What guests remember. What breaks when you treat hospitality like catering. What a closing gift needs to feel like when somebody is getting keys to a house. What happens in a kitchen when the night is actually on.",
        "I understand design, development, architecture, and how to turn a business conversation into something software can enforce without making the whole thing feel like software.",
        "That’s the working relationship. He brings the reality of the table. I figure out how to hold it.",
        "I’m not going to invent quotes or reconstruct specific calls. What I can show you is what landed in the product. Because once you look at the code, you can see exactly where the business started shaping the system.",
      ],
    },
    {
      type: "heading",
      text: "The public site first",
    },
    {
      type: "prose",
      paragraphs: [
        "The public site is Next.js, React, TypeScript. Payload CMS on MongoDB. Resend for email. Square for payments. Deployed on Vercel.",
        "Homepage memories aren’t hard-coded filler. Published testimonials come out of the system and render on the home page. Small thing, but it matters. The marketing surface and the operating data are connected.",
        "A lot of the visual work is what you’d expect if you’ve seen hospitality done carefully: typography, pacing, imagery, motion that doesn’t get in the way. I’m not going to spend this article congratulating myself for fonts. The interesting part is what sits behind that surface.",
        "Because once Martin started using the system, the website stopped being the whole project.",
      ],
    },
    {
      type: "split",
      eyebrow: "Public experience",
      title: "Invitation layer",
      body: [
        "Experiences, packages, concierge, the valley, inquiry. The guest-facing surface is designed to feel like hospitality — not a restaurant template with a contact button taped on.",
        "See the live site: [platetheumpqua.com](https://platetheumpqua.com).",
      ],
      figure: {
        src: "/journal/plate-the-umpqua/live-homepage-mobile.webp",
        alt: "Plate the Umpqua mobile homepage",
        caption: "Live mobile public experience",
      },
    },
    {
      type: "heading",
      text: "Plate OS",
    },
    {
      type: "prose",
      paragraphs: [
        "If somebody asks what Martin got, and you only say “a website,” you’re underselling it by a mile.",
        "Plate OS is the operator side. Authenticated. Separate from the public marketing pages. It lives under `/os`, with Payload Admin still available for deeper CMS work.",
        "When an operator signs in, they land on **Today at Plate The Umpqua**.",
        "That board is designed to surface the stuff that actually needs attention:",
      ],
    },
    {
      type: "list",
      items: [
        "new inquiries",
        "open pipeline",
        "upcoming events",
        "culinary work in motion",
      ],
    },
    {
      type: "prose",
      paragraphs: [
        "It’s a morning board pattern. What’s waiting. What’s coming. What needs a decision.",
        "Without something like that, a private dining business usually ends up duct-taped across inbox, texts, notes apps, spreadsheets, maybe a form tool, maybe a PDF menu floating around somewhere, maybe Square on its own island.",
        "That’s fine until volume shows up. Then it gets messy fast.",
      ],
    },
    {
      type: "heading",
      level: 3,
      text: "What the operator sees vs what a guest sees",
    },
    {
      type: "prose",
      paragraphs: [
        "This split is important.",
        "Operators see clients, inquiries, events, invoices, recipes, menus, Square connection status, partner sales materials. They can write internal notes. They can see culinary detail that never needs to be public. They can classify a lead. They can build a menu, send it for review, follow payment status, keep relationship notes.",
        "A guest sees the public site, or a temporary token page.",
      ],
    },
    {
      type: "list",
      items: [
        "`/inquiry` for requests",
        "`/menu-review/[token]` for reviewing a menu",
        "`/invoice/[token]` for viewing an invoice and the hosted payment path",
        "`/experience/[token]` for post-event feedback",
      ],
    },
    {
      type: "prose",
      paragraphs: [
        "They’re not browsing the operating system. They get the slice they need, for as long as they need it.",
      ],
    },
    {
      type: "figure",
      src: "/journal/plate-the-umpqua/homepage-02.webp",
      alt: "Plate the Umpqua storytelling section from the public site",
      caption: "Public storytelling stays calm. Operator tooling stays behind authentication.",
      layout: "wide",
    },
    {
      type: "figure",
      src: "/journal/plate-the-umpqua/live-inquiry.webp",
      alt: "Plate the Umpqua public inquiry form",
      caption: "Public inquiry surface — calm form, heavier pipeline underneath.",
      layout: "wide",
    },
    {
      type: "heading",
      level: 3,
      text: "How an inquiry becomes useful",
    },
    {
      type: "prose",
      paragraphs: [
        "Somebody submits an inquiry on the site.",
        "That doesn’t just fire an email into the void.",
        "The request hits validation first. Then we look up whether that email already belongs to a client. If it does, we attach the inquiry to the existing record. If it doesn’t, we create one and shape it based on what they submitted: private guest vs partner/realtor-style lead, VIP flags when the budget/source warrants it, preferred experience style, relationship notes.",
        "Then the inquiry itself gets filed: source, guests, region, occasion mapping, priority, status.",
        "Then Resend sends a branded notification with reply-to set to the guest.",
        "So when Plate OS opens, the inquiry isn’t something you have to reconstruct from an email thread. It’s an actual record you can work.",
      ],
    },
    {
      type: "heading",
      level: 3,
      text: "How menus move",
    },
    {
      type: "prose",
      paragraphs: [
        "Recipes live in the system with chef notes and public-facing language.",
        "Menus get built from those recipes into sections and items. They can be revised, keep history, and move into a state ready to send.",
        "When guest feedback is needed, the system generates a review token, stores a hash, sets an expiration, and can email a link. The guest opens a temporary review page. They see the presentation version. They don’t get the kitchen notebook.",
        "That’s the kind of thing that sounds minor until you’ve watched a hospitality business try to do it over email attachments.",
      ],
    },
    {
      type: "heading",
      level: 3,
      text: "How money connects",
    },
    {
      type: "prose",
      paragraphs: [
        "Invoices are Plate records first.",
        "Line items. Totals in cents. Client billing info. Internal notes. Status.",
        "When it’s time to collect, Plate can create a Square hosted payment invoice from that record. Square handles the hosted payment surface. Plate stays the source of truth for the business document. Webhooks synchronize payment evidence back into Plate.",
        "The operator sees the operational invoice.",
        "The customer sees the public invoice / pay experience.",
        "Same money. Different sides of the glass.",
      ],
    },
    {
      type: "diagram",
      id: "plate-architecture",
      caption:
        "Verified system shape: public surfaces, Plate OS, Payload/MongoDB, Resend, Square, SEO/GA4.",
    },
    {
      type: "under-the-hood",
      index: "01",
      title: "One price. One source of truth.",
      businessProblem:
        "Partner Concierge pricing was showing up in too many places. Marketing pages. Inquiry deep links. Checkout. Structured data. If those drift, the business starts disagreeing with itself.",
      explanation: [
        "Guest rules and prepaid packages live in one module. Everything else reads from it.",
        "In plain English: the offer rules live in TypeScript. Pages don’t invent their own version of reality. Checkout doesn’t invent one either.",
      ],
      filePath: "lib/site/partnerConciergePricing.ts",
      code: {
        language: "ts",
        code: `export const PARTNER_GUEST_RULES = {
  includedAdults: 2,
  includedChildren: 3,
  additionalPersonPrice: "$100",
  additionalPersonPriceCents: 10000,
} as const

export const PREPAID_PARTNER_PACKAGES = [
  {
    title: "Single Experience",
    tableCount: 1,
    price: "$425",
    priceCents: 42500,
  },
  {
    title: "Professional 5-Pack",
    tableCount: 5,
    price: "$1,750",
    priceCents: 175000,
  },
  {
    title: "Professional 10-Pack",
    tableCount: 10,
    price: "$3,400",
    priceCents: 340000,
  },
]`,
      },
    },
    {
      type: "figure",
      src: "/journal/plate-the-umpqua/live-partner-concierge.webp",
      alt: "Plate the Umpqua Partner Concierge program page",
      caption: "Partner Concierge hub — professional gifting before industry-specific Welcome Home pages.",
      layout: "wide",
    },
    {
      type: "heading",
      text: "Partner Concierge / Welcome Home",
    },
    {
      type: "prose",
      paragraphs: [
        "This is where the project got really interesting.",
        "Private dining for homeowners is one business. Professional gifting is another.",
        "Realtors, doctors, attorneys, builders, sales teams. People whose work depends on relationships. People who are tired of dropping another basket on a counter and calling it gratitude.",
        "For real estate, the occasion brand is **Welcome Home** — Welcome Home Private Dining as a prepaid closing-gift experience inside Partner Concierge.",
        "The offer landed like this:",
      ],
    },
    {
      type: "list",
      items: [
        "Single Experience — $425",
        "Professional 5-Pack — $1,750",
        "Professional 10-Pack — $3,400",
        "Includes up to 2 adults + 3 children from the recipient household",
        "Additional guests: $100 per person",
      ],
    },
    {
      type: "prose",
      paragraphs: [
        "That didn’t start as a webpage. It started as a business conversation. What should be included? What feels complete as a gift? What should the professional prepay so the recipient never feels like they got a half-paid evening? What happens at closing? Who presents the certificate?",
        "Once those answers got clear enough, they became rules. Then pricing. Then code. Then pages. Then checkout. Then print.",
      ],
    },
    {
      type: "figure",
      src: "/journal/plate-the-umpqua/live-welcome-home.webp",
      alt: "Welcome Home real estate Partner Concierge landing page",
      caption: "Live Welcome Home / real-estate Partner Concierge landing.",
      layout: "wide",
    },
    {
      type: "heading",
      level: 3,
      text: "From idea to system",
    },
    {
      type: "prose",
      paragraphs: [
        "Here’s the actual chain:",
      ],
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Define the household rules and package prices",
        "Put them in the pricing source of truth",
        "Build Partner Concierge pages, including industry landings like real estate",
        "Deep-link inquiry and purchase flows with package context",
        "Let a professional check out",
        "Create a Plate invoice from the trusted package",
        "Hand payment to Square’s hosted payment surface",
        "Generate print certificates and sell sheets from the same program logic",
        "Track funnel events in GA4",
        "Leave fulfillment and scheduling with Martin",
      ],
    },
    {
      type: "prose",
      paragraphs: [
        "For Realtors, the human flow is simple:",
        "Buy the package. Present a Welcome Home certificate at closing. Homeowner redeems later. Martin coordinates the evening.",
        "We could have kept going. QR redemption. Scheduling portal. Automated fulfillment. Certificate inventory tracking. The whole machine.",
        "We didn’t.",
        "Once somebody has that certificate in their hands, Martin taking over is better. The homeowner isn’t wrestling a booking widget during move-in week. Menu, timing, dietary notes, the actual evening: that’s hospitality. Automating the purchase made sense. Automating the human part of redemption just so we could say “fully automated” would’ve been dumb.",
        "The certificate config even says it out loud. Print design system. Bulk inventory. Handwritten Presented To / Presented By. No QR generation. No redemption engine. No fulfillment logic.",
        "Purchase is software. The dinner stays Martin’s.",
        "Explore the live Partner Concierge surfaces: [Partner Concierge](https://platetheumpqua.com/partner-concierge) and [Welcome Home for real estate](https://platetheumpqua.com/partner-concierge/real-estate).",
      ],
    },
    {
      type: "under-the-hood",
      index: "02",
      title: "What actually happens when somebody sends an inquiry",
      businessProblem:
        "A normal contact form dumps text into an inbox. That’s not enough when leads come from different channels and need different follow-up.",
      flow: [
        "visitor submits form",
        "size/origin checks",
        "field allowlist + spam defenses",
        "validate enums (guests, budget, package, urgency, source)",
        "find or create client in Payload",
        "create inquiry record",
        "classify lead type",
        "Resend email notification",
        "inquiry shows up in Plate OS",
      ],
      explanation: [
        "Then the route upserts the client and files the inquiry. Partner sources get treated like partner leads. Higher budgets can land as VIP. The notification isn’t just “New form submission.” It has a lead type and the fields that matter.",
        "So yeah: still an email. But the email is the notification layer. The system of record is Plate.",
      ],
      filePath: "lib/inquiry/validatePublicInquiry.ts",
      code: {
        language: "ts",
        code: `for (const key of keys) {
  if (!(ALLOWED_INQUIRY_KEYS as readonly string[]).includes(key)) {
    return {
      ok: false,
      message: 'Invalid request.',
      status: 400,
      code: 'unsupported_field',
    }
  }
}

const honeypot = clean(body.companyWebsite, 200)
if (honeypot) {
  return {
    ok: false,
    message: 'Unable to submit inquiry.',
    status: 400,
    code: 'honeypot',
  }
}

if (now - startedAt < 1200) {
  return {
    ok: false,
    message: 'Please wait a moment and try again.',
    status: 429,
    code: 'timing_fast',
  }
}`,
      },
    },
    {
      type: "under-the-hood",
      index: "03",
      title: "From package selection to Square",
      businessProblem:
        "If checkout trusts a price coming from the browser, somebody can tamper with the request and try to pay the wrong amount.",
      explanation: [
        "The browser sends a package ID like `five-pack`, plus billing details.",
        "The browser does not get to decide that the five-pack costs $1,750.",
        "The server resolves the package ID against trusted pricing, upserts a partner client, creates a Plate invoice with server-resolved `priceCents`, then can create a Square hosted payment invoice and return the pay URL. Webhooks synchronize payment evidence back into Plate.",
        "Plate owns the invoice and business record. Square handles the hosted payment surface. If Square isn’t connected, checkout fails cleanly and tells the buyer to request information so Martin can follow up. After payment, certificate fulfillment is still manual. That’s intentional.",
        "One more money detail people don’t usually see: Square OAuth access tokens aren’t sitting readable in the database. They’re encrypted before storage. AES-256-GCM. Not because it sounds impressive. Because payment credentials are not something I want casually exposed if a database dump ever happens.",
        "There is no Stripe in this build. Square is the payment path.",
      ],
      flow: [
        "package select",
        "validate checkout payload",
        "resolvePartnerPackage(packageId)",
        "upsert partner client",
        "create Plate invoice",
        "create Square hosted payment invoice",
        "return Square pay URL",
        "webhook syncs payment evidence",
      ],
      filePath: "lib/os/partnerConcierge/packages.ts",
      code: {
        language: "ts",
        code: `export function resolvePartnerPackage(packageId: unknown) {
  if (!isPartnerPackageId(packageId)) return null

  const source = PREPAID_PARTNER_PACKAGES[PACKAGE_INDEX[packageId]]
  if (!source) return null

  return {
    id: packageId,
    title: source.title,
    tableCount: source.tableCount,
    priceCents: source.priceCents,
    priceLabel: source.price,
    lineDescription: \`Partner Concierge — \${source.title}\`,
  }
}`,
      },
    },
    {
      type: "under-the-hood",
      index: "04",
      title: "How Martin sends a menu without exposing the kitchen",
      businessProblem:
        "Guests need to review a menu. Operators need internal notes, recipe linkage, dietary handling, and revision history that should not all spill onto a public URL forever.",
      explanation: [
        "Operator auth and culinary permission checks come first. Then the system generates a review token, stores a hash and expiration on the menu, optionally emails the link, and the guest opens `/menu-review/[token]` with a public presentation payload only.",
        "We store a hash, not a forever-public kitchen document. The link can expire. Internal notes stay internal. Guest gets the version meant for them.",
        "Same idea shows up after events. Feedback tokens. Optional Google review path. Cron sweeps so follow-up doesn’t depend on remembering every single evening by hand.",
      ],
      flow: [
        "operator auth",
        "culinary permission check",
        "generate review token",
        "store token hash + expiration",
        "optional Resend email",
        "guest opens /menu-review/[token]",
      ],
      filePath: "lib/os/menus/mutateMenu.ts",
      code: {
        language: "ts",
        code: `const token = generateReviewToken()
const expiresAt = reviewTokenExpiresAt()

await payload.update({
  collection: 'menus',
  id: rawId,
  data: {
    reviewTokenHash: hashReviewToken(token),
    reviewTokenExpiresAt: expiresAt.toISOString(),
    reviewTokenRevokedAt: null,
    status: 'sent',
    sentAt: nowIso,
  },
})

const reviewUrl = \`\${siteOrigin()}/menu-review/\${token}\``,
      },
    },
    {
      type: "heading",
      text: "The boring work is most of the work",
    },
    {
      type: "prose",
      paragraphs: [
        "I’m going to say this plainly: a huge amount of this project is invisible.",
        "Validation. Role checks. Revalidation after writes. Environment variables. Integer cents for invoice math. Webhook reconciliation so Plate and Square don’t drift. Robots rules so Google doesn’t index `/os` and `/admin`. Print CSS so a certificate survives contact with a real printer. Mobile fixes because Payload create screens were miserable on a phone, so day-to-day create flows got redirected into Plate OS instead.",
        "None of that makes a pretty homepage screenshot.",
        "All of it is why the homepage can stay calm.",
        "If a site looks simple, that doesn’t mean the build was simple. Sometimes it means a lot of complexity got handled underneath so the guest never has to think about it.",
        "This is the same pattern that shows up across [hospitality work](/industries/hospitality), [luxury website experiences](/services/luxury-website-experiences), and broader [platforms](/platforms) thinking at KXD. More on that in related Journal pieces like [when a business has outgrown its tools](/insights/when-your-business-has-outgrown-its-tools) and [what disconnected tools are costing you](/insights/what-disconnected-tools-are-costing-you).",
      ],
    },
    {
      type: "under-the-hood",
      index: "05",
      title: "What Google sees that customers don’t",
      businessProblem:
        "A person can look at Welcome Home pricing and understand the offer. Google needs structured signals if you want the business interpreted correctly.",
      explanation: [
        "On the Partner Concierge pages, a visitor sees packages and copy.",
        "Underneath, we generate JSON-LD from the same offer structure: Service, OfferCatalog, FAQPage on industry pages, BreadcrumbList.",
        "Sitewide, Plate also publishes a FoodEstablishment graph with Roseburg / Umpqua Valley / Southern Oregon area context. That’s Plate’s geography. Makes sense for Martin’s business.",
        "There’s also a sitemap that includes the partner industry URLs, robots rules that keep operator surfaces out of the index, canonicals, Open Graph, and GA4 with partner funnel events for package select, checkout start, and purchase complete.",
        "The useful part isn’t “we did SEO.” It’s that the machine-readable offers come from the same package definitions the checkout trusts. One business offer. Multiple consumers: people, payment code, and search engines.",
      ],
      filePath: "lib/site/partnerConciergeSchema.ts",
      code: {
        language: "ts",
        code: `{
  '@type': 'Service',
  name: 'Plate The Umpqua Partner Concierge',
  provider: PROVIDER,
  areaServed: ['Roseburg, Oregon', 'Umpqua Valley', 'Southern Oregon'],
  offers: prepaidOffers(pageUrl),
},
{
  '@type': 'OfferCatalog',
  name: 'Partner Concierge Prepaid Packages',
  itemListElement: PREPAID_PARTNER_PACKAGES.map((pkg) => ({
    '@type': 'Offer',
    name: pkg.title,
    price: String(pkg.priceCents / 100),
    priceCurrency: 'USD',
  })),
}`,
      },
    },
    {
      type: "heading",
      text: "What this build taught me",
    },
    {
      type: "prose",
      paragraphs: [
        "I keep coming back to the same thing.",
        "Martin didn’t need a prettier layer on top of a messy operation. He needed the public experience and the operating system to grow up together.",
        "That’s why Plate has a hospitality website people can feel, an inquiry pipeline that creates records, menus with guest review links, invoices connected to Square without giving Square the whole brand relationship, Partner Concierge with real pricing rules, Welcome Home certificates and sell sheets, analytics and schema wired to the actual offer, and deliberate blank space where automation would make the experience worse.",
        "Some of this started as website work. Some of it became product work. A lot of it was just us following the business wherever it pointed next.",
        "You can see the thinner portfolio summary on our [Plate the Umpqua work page](/work/plate-the-umpqua). This Journal piece is the deeper version — closer to what actually got built.",
        "I thought I was building Martin a website.",
        "We built Plate OS. And we’re still in a position to keep building on it, because the foundation isn’t a theme. It’s a system shaped around how Plate the Umpqua actually runs.",
      ],
    },
  ],
};
