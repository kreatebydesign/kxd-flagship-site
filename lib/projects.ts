export type ProjectItem = {
  slug: string;
  title: string;
  industry: string;
  service: string;
  outcome: string;
  description: string;
  image: string | null;
  logo?: string;
  year: string;
  featured?: boolean;
  imageryPending?: boolean;
  imageryLabel?: string;
  imagePosition?: string;
  imageContain?: boolean;
  tier: "primary" | "secondary";
};

export type ShowcaseImage = {
  src: string;
  alt: string;
  caption?: string;
};

export type CaseStudy = {
  slug: string;
  title: string;
  industry: string;
  scope: string[];
  tagline: string;
  url: string;
  status: string;
  year: string;
  image: string | null;
  logo?: string;
  context: string;
  challenge: string;
  strategy: string;
  execution: string[];
  qualitativeOutcomes: string[];
  whyItWorked: string;
  showcaseImages: ShowcaseImage[];
};

export const PROJECTS: ProjectItem[] = [
  {
    slug: "primal-motorsports",
    title: "Primal Motorsports",
    industry: "Motorsports",
    service: "Luxury Website Experiences",
    outcome: "Flagship presence for a performance brand that competes at the top.",
    description:
      "Website, membership architecture, and growth infrastructure for one of motorsports' most ambitious brands.",
    image: "/migrated-assets/projects/primal-motorsports.jpg",
    year: "2025",
    featured: true,
    tier: "primary",
  },
  {
    slug: "cusick-morgan-motorsports",
    title: "Cusick Morgan Motorsports",
    industry: "Motorsports",
    service: "Luxury Website Experiences",
    outcome: "A racing presence with the speed and discipline of the team behind it.",
    description:
      "Cinematic web design built for a professional motorsport program operating at full throttle.",
    image: "/migrated-assets/projects/cusick-morgan.jpg",
    year: "2025",
    tier: "primary",
  },
  {
    slug: "plate-the-umpqua",
    title: "Plate the Umpqua",
    industry: "Hospitality",
    service: "Luxury Website Experiences",
    outcome: "Hospitality brought online with the same care as the dining room.",
    description:
      "A refined digital foundation for a regional hospitality brand building its reputation.",
    image: "/migrated-assets/case-studies/plate-the-umpqua/hero.webp",
    logo: "/migrated-assets/logos/plate-the-umpqua.svg",
    year: "2025",
    tier: "primary",
  },
  {
    slug: "autodv8ions",
    title: "AutoDV8ions",
    industry: "Automotive",
    service: "Brand Systems & Identity",
    outcome: "Boutique automotive identity with a point of view sharp enough to cut.",
    description:
      "Brand-forward web design for an automotive studio that refuses to look like everyone else.",
    image: "/migrated-assets/case-studies/autodv8ions/hero.webp",
    logo: "/migrated-assets/logos/dv8.svg",
    year: "2025",
    tier: "primary",
  },
  {
    slug: "democratic-club-greater-tracy",
    title: "Democratic Club of Greater Tracy",
    industry: "Civic",
    service: "Growth Infrastructure",
    outcome: "Clear digital presence for a civic organization built on participation.",
    description:
      "Website and engagement architecture for a community-driven organization.",
    image: "/migrated-assets/case-studies/democratic-club-greater-tracy/hero.webp",
    logo: "/migrated-assets/logos/the-democratic.svg",
    year: "2026",
    tier: "secondary",
  },
  {
    slug: "spur-restaurant",
    title: "Spur Restaurant & Bar",
    industry: "Hospitality",
    service: "Luxury Website Experiences",
    outcome: "A restaurant presence as considered as the atmosphere inside.",
    description:
      "Premium web design for a restaurant and bar built on local reputation.",
    image: "/migrated-assets/case-studies/spur-restaurant/hero.webp",
    year: "2026",
    tier: "secondary",
  },
  {
    slug: "hair-mafia",
    title: "Hair Mafia",
    industry: "Beauty / Salon",
    service: "Luxury Website Experiences",
    outcome: "A salon brand with the confidence and craft to own the room.",
    description:
      "Brand-forward web experience for a premium salon built on artistry and reputation.",
    image: "/migrated-assets/projects/hair-mafia.jpg",
    year: "2026",
    tier: "secondary",
  },
  {
    slug: "golden-state-warriors",
    title: "Golden State Warriors",
    industry: "NBA / Sports",
    service: "Brand Systems & Identity",
    outcome: "In-house creative support for one of the most recognized brands in professional sports.",
    description:
      "Design team support for the Golden State Warriors in-house creative program.",
    image: "/images/work/screenshots/golden-state-warriors/desktop-home.png",
    year: "2024",
    tier: "secondary",
  },
  {
    slug: "sbe-hyde-lounge",
    title: "SBE / Hyde Lounge",
    industry: "Hospitality",
    service: "Luxury Website Experiences",
    outcome: "A nightlife experience that translates from the velvet rope to the browser.",
    description:
      "Digital presence for Hyde Lounge at Crypto.com Arena — SBE's flagship LA nightlife venue.",
    image: "/images/work/screenshots/sbe-hyde-lounge/desktop-home.png",
    year: "2024",
    tier: "secondary",
  },
  {
    slug: "on-track-performance",
    title: "On Track Performance",
    industry: "Motorsports",
    service: "Luxury Website Experiences",
    outcome: "Performance-forward digital presence for a motorsports business built on precision.",
    description:
      "Website and brand presence for an automotive performance shop with a track-day culture.",
    image: "/images/work/screenshots/on-track-performance/desktop-home.png",
    year: "2024",
    tier: "secondary",
  },
  {
    slug: "dialed-in-electric",
    title: "Dialed In Electric",
    industry: "Electrical / Trades",
    service: "Luxury Website Experiences",
    outcome: "A trades business that looks as sharp as the work it delivers.",
    description:
      "Brand presence and website for an electrical contractor building a premium service reputation.",
    image: null,
    logo: "/migrated-assets/logos/dialed-in-electric.svg",
    imageryPending: true,
    imageryLabel: "Site Refresh In Progress",
    year: "2025",
    tier: "secondary",
  },
];

export const PRIMARY_PROJECTS = PROJECTS.filter((p) => p.tier === "primary");
export const SECONDARY_PROJECTS = PROJECTS.filter((p) => p.tier === "secondary");

export const CASE_STUDIES: Record<string, CaseStudy> = {
  "primal-motorsports": {
    slug: "primal-motorsports",
    title: "Primal Motorsports",
    industry: "Motorsports",
    scope: ["Luxury Website Experiences", "Growth Infrastructure", "Operational Platform"],
    tagline: "Building the digital foundation for a modern motorsports organization.",
    url: "https://primalmotorsports.com",
    status: "Live",
    year: "2025",
    image: "/migrated-assets/projects/primal-motorsports.jpg",
    context:
      "Primal Motorsports isn't a weekend racing club. It's a competitive organization with professional drivers, live events, and a growing ecosystem of partners, members, and fans. The brand had real momentum and real credibility — but the digital infrastructure didn't reflect either. What existed online was a starting point. What the organization needed was a foundation.",
    challenge:
      "Three distinct audiences, three distinct needs — and no existing infrastructure to serve any of them well. Prospective partners needed to see a brand worthy of serious investment. Team members needed operational tools that matched how they actually worked. Leadership needed visibility across the organization without adding overhead. A single marketing website wasn't going to solve that. The scope required architecture, not decoration.",
    strategy:
      "Strategy first. KXD mapped each audience independently — what they needed to see, what they needed to do, and what a failed digital experience would cost the organization. From there, the architecture emerged: a premium public-facing presence designed around partner credibility, a member dashboard built for team accountability and access, and an operations interface that gave leadership the visibility to run the organization with confidence. Every decision was evaluated against the same standard: does this serve the organization's actual goals, or does it just look like a motorsports website?",
    execution: [
      "Flagship website — premium brand presence built for partner and sponsor conversations, with clear positioning, cinematic visual treatment, and structured inquiry pathways.",
      "Driver dashboard — member-facing experience enabling team workflows, driver data access, and organizational accountability.",
      "Operations interface — internal platform giving leadership visibility across events, logistics, and team coordination without adding administrative complexity.",
    ],
    qualitativeOutcomes: [
      "Flagship digital presence that holds weight in partner and sponsor conversations",
      "Member infrastructure that supports team accountability and operational clarity",
      "Internal operations layer that scales with organizational growth",
      "A unified digital identity across three distinct audience experiences",
    ],
    whyItWorked:
      "The result works because it was designed around the organization's actual needs — not what a motorsports website is supposed to look like. Every section earns its place. Every experience serves a defined audience. The outcome wasn't driven by trend or template — it came from asking harder questions upfront and holding the architecture to the same standard the team holds itself on track.",
    showcaseImages: [
      {
        src: "/migrated-assets/case-studies/primal-motorsports/hero.webp",
        alt: "Primal Motorsports — flagship website hero",
        caption: "Public-facing brand presence",
      },
      {
        src: "/migrated-assets/case-studies/primal-motorsports/homepage-02.webp",
        alt: "Primal Motorsports — driving school and race programs",
        caption: "Program architecture",
      },
      {
        src: "/migrated-assets/case-studies/primal-motorsports/dashboard-hero.webp",
        alt: "Primal Motorsports — driver portal dashboard",
        caption: "Driver portal",
      },
      {
        src: "/migrated-assets/case-studies/primal-motorsports/ops-hero.webp",
        alt: "Primal OS — executive operations interface",
        caption: "Primal OS — operations layer",
      },
    ],
  },

  "cusick-morgan-motorsports": {
    slug: "cusick-morgan-motorsports",
    title: "Cusick Morgan Motorsports",
    industry: "Motorsports",
    scope: ["Luxury Website Experiences", "Brand Systems & Identity"],
    tagline: "A premium digital experience built around performance and growth.",
    url: "https://cusickmotorsports.com",
    status: "Live",
    year: "2025",
    image: "/migrated-assets/projects/cusick-morgan.jpg",
    context:
      "Cusick Morgan Motorsports has the results. The credentials, the team, the competitive record — everything required to earn a serious partnership conversation. The gap wasn't performance. It was presentation. In motorsports, credibility is earned on track. Partnerships are won off it.",
    challenge:
      "Without a digital presence that matched the team's on-track standard, every sponsor conversation started at a disadvantage. The brand was being judged on an introduction it hadn't made yet. Good teams with weak digital presence lose deals they should win — not on capability, but on credibility before the meeting starts.",
    strategy:
      "Partnership visibility was the north star. Every design decision — layout, content hierarchy, imagery treatment — was evaluated through one lens: does this make a potential partner more confident in this team? Secondary to that, team identity. The brand had to feel like a serious competitive operation — not a hobby club with a well-designed website. Copy was written to position results, not just announce them. The information architecture was built to guide a sponsor from interest to inquiry without friction.",
    execution: [
      "Team website — cinematic design built around the team's competitive identity, race history, and driver profiles.",
      "Partner & sponsor pathways — structured content and inquiry architecture designed to move a prospect from interest to conversation.",
      "Brand system alignment — visual language and copy direction that carries weight in a boardroom as much as in a browser.",
    ],
    qualitativeOutcomes: [
      "Professional digital presence that earns credibility before the first conversation",
      "Partnership-ready architecture with clear pathways for sponsor engagement",
      "Competitive brand identity that reflects the team's actual performance standard",
      "Digital foundation that holds up in presentations, pitch decks, and introductions",
    ],
    whyItWorked:
      "It worked because the goals were defined before the design started. Not 'we need a website' — but 'we need partners, and we need this to get us in the room.' That clarity drove every decision. When the purpose is specific, the outcome is specific. Generic briefs produce generic work. This wasn't generic.",
    showcaseImages: [
      {
        src: "/migrated-assets/case-studies/cusick-morgan-motorsports/hero.webp",
        alt: "Cusick Morgan Motorsports — homepage hero",
        caption: "Team brand presence",
      },
      {
        src: "/migrated-assets/case-studies/cusick-morgan-motorsports/homepage-02.webp",
        alt: "Cusick Morgan Motorsports — partnership and program sections",
        caption: "Partnership pathways",
      },
      {
        src: "/migrated-assets/case-studies/cusick-morgan-motorsports/homepage-03.webp",
        alt: "Cusick Morgan Motorsports — featured partners section",
        caption: "Featured partners",
      },
    ],
  },

  "plate-the-umpqua": {
    slug: "plate-the-umpqua",
    title: "Plate the Umpqua",
    industry: "Hospitality",
    scope: ["Luxury Website Experiences", "Brand Systems & Identity"],
    tagline: "Elevating private hospitality through intentional digital experiences.",
    url: "https://platetheumpqua.com",
    status: "Live",
    year: "2025",
    image: null,
    logo: "/migrated-assets/logos/plate-the-umpqua.svg",
    context:
      "Plate the Umpqua is the kind of hospitality experience that earns its reputation through the room, not the marketing. Guest loyalty was built through care, craft, and attention to detail that most dining experiences don't attempt. The brand had something genuine — it needed a digital presence that could carry it.",
    challenge:
      "First impressions happen before arrival. For most prospective guests, the website is the experience before the experience — and it was underselling everything the brand had earned. The gap between what a guest found online and what they encountered in the room was creating the wrong expectation before they'd even made a reservation.",
    strategy:
      "The approach was precise: treat the website as the opening chapter of the hospitality experience — not a listing, not a booking page, but an invitation. Warmth first. Specificity second. The tone, layout, and content hierarchy were all built to replicate the feeling of being welcomed — before the guest arrives. Every section earns its place by adding to the story. Nothing is decorative without purpose.",
    execution: [
      "Brand-aligned web presence — a refined digital introduction that matches the hospitality standard guests experience in the room.",
      "Inquiry and reservation pathways — clear, low-friction flows that convert interest into bookings without disrupting the brand experience.",
      "Editorial storytelling — content structure that communicates the brand's character, regional identity, and genuine craft.",
    ],
    qualitativeOutcomes: [
      "Digital presence that carries the same standard as the in-person experience",
      "Refined first impression that sets the right expectation before arrival",
      "Inquiry experience that feels aligned with the brand's hospitality ethos",
      "Foundation that grows with the brand's reputation and reach",
    ],
    whyItWorked:
      "Hospitality is about making people feel something before they've decided anything. The site does that now. It doesn't try to list every offering or justify every choice — it makes you want to be there. That's the standard the brand sets in the room. The digital experience had to match it. No more gap between the promise and the introduction.",
    showcaseImages: [
      {
        src: "/migrated-assets/case-studies/plate-the-umpqua/hero.webp",
        alt: "Plate the Umpqua — homepage hero",
        caption: "The opening invitation",
      },
      {
        src: "/migrated-assets/case-studies/plate-the-umpqua/homepage-02.webp",
        alt: "Plate the Umpqua — storytelling section",
        caption: "Brand positioning",
      },
      {
        src: "/migrated-assets/case-studies/plate-the-umpqua/homepage-03.webp",
        alt: "Plate the Umpqua — experience sections",
        caption: "Experience design",
      },
    ],
  },

  "autodv8ions": {
    slug: "autodv8ions",
    title: "AutoDV8ions",
    industry: "Automotive",
    scope: ["Brand Systems & Identity", "Luxury Website Experiences"],
    tagline: "Transforming automotive interest into qualified opportunities.",
    url: "https://autodv8ions.com",
    status: "Live",
    year: "2025",
    image: null,
    logo: "/migrated-assets/logos/dv8.svg",
    context:
      "AutoDV8ions is a boutique automotive studio that earns its reputation through precision and a point of view. Referral-driven, quality-focused, and deeply committed to doing the work right — the kind of studio where every client is a qualified one. The work was exceptional. The digital introduction wasn't anywhere close.",
    challenge:
      "Reputation is powerful. It's also invisible online. The studio's craftsmanship and aesthetic were well-known to those who already knew — but without a digital presence that matched the studio's standard, growth was limited to the reach of existing word-of-mouth. Qualified prospects were finding nothing, or finding something that didn't reflect the quality of the actual work.",
    strategy:
      "Lead with identity, not services. The strategy wasn't to build a bigger audience — it was to build the right first impression for the right client. The website had to function as a portfolio, a filter, and a statement — in that order. Design itself as demonstration: if the site looks like it was built with care and precision, it sets the expectation that the studio operates the same way. Copy was written to speak to a client who already has taste, not to explain why taste matters.",
    execution: [
      "Brand-forward website — identity-led design built to communicate the studio's point of view before its service list.",
      "Inquiry and lead architecture — structured pathways that convert qualified interest into direct opportunities.",
      "Brand system refinement — visual language, tone, and positioning that carries the studio's standard across every touchpoint.",
    ],
    qualitativeOutcomes: [
      "Digital identity that reflects the studio's precision and point of view",
      "Brand-forward presence that attracts aligned, quality-focused clients",
      "Inquiry pathways built to convert genuine interest into direct conversations",
      "First impression that matches the standard of the actual work",
    ],
    whyItWorked:
      "It works because it's specific. It's not trying to appeal to everyone — it's built for the client who already has taste, who recognizes quality when they see it, and wants to work with people who hold the same standard. That specificity is the strategy. Broad positioning produces unqualified inquiries. Sharp positioning produces the right ones.",
    showcaseImages: [
      {
        src: "/migrated-assets/case-studies/autodv8ions/hero.webp",
        alt: "AutoDV8ions — homepage hero",
        caption: "Brand-forward digital presence",
      },
      {
        src: "/migrated-assets/case-studies/autodv8ions/homepage-02.webp",
        alt: "AutoDV8ions — about section",
        caption: "Identity and positioning",
      },
      {
        src: "/migrated-assets/case-studies/autodv8ions/homepage-03.webp",
        alt: "AutoDV8ions — services section",
        caption: "Service architecture",
      },
    ],
  },

  "democratic-club-greater-tracy": {
    slug: "democratic-club-greater-tracy",
    title: "Democratic Club of Greater Tracy",
    industry: "Civic",
    scope: ["Growth Infrastructure"],
    tagline: "Clear digital presence for a civic organization built on participation.",
    url: "https://greatertracydems.org",
    status: "Live",
    year: "2026",
    image: "/migrated-assets/case-studies/democratic-club-greater-tracy/hero.webp",
    logo: "/migrated-assets/logos/the-democratic.svg",
    context:
      "The Democratic Club of Greater Tracy has active membership, regular events, and genuine community reach. What it lacked was a digital infrastructure to match its activity — a place where members could connect, events could be found, and prospective participants could understand the organization's purpose and impact.",
    challenge:
      "Without a digital presence, the organization's reach was limited to those who already knew it existed. Member engagement depended on personal outreach. Events lived in emails. The organization was doing real work without the infrastructure to grow it.",
    strategy:
      "Accessibility and clarity first. The design language had to feel welcoming — not institutional — and the information architecture had to serve both existing members and people discovering the organization for the first time. Content structure built around participation: events, membership, mission, contact.",
    execution: [
      "Civic web presence — clear, accessible design that reflects the organization's community focus and reach.",
      "Member and event architecture — structured pathways for participation, membership inquiry, and event visibility.",
    ],
    qualitativeOutcomes: [
      "Digital presence that reflects the organization's purpose and community reach",
      "Accessible architecture supporting member engagement and event visibility",
      "Clear participation pathways for both existing members and new prospects",
    ],
    whyItWorked:
      "Civic organizations don't need impressiveness — they need clarity. The site works because it prioritizes the people it's built for, not the organization's need to appear important. The result is a digital presence that feels like the club itself: open, purposeful, and built for participation.",
    showcaseImages: [
      {
        src: "/migrated-assets/case-studies/democratic-club-greater-tracy/hero.webp",
        alt: "Democratic Club of Greater Tracy — homepage",
        caption: "Public digital presence",
      },
      {
        src: "/migrated-assets/case-studies/democratic-club-greater-tracy/homepage-02.webp",
        alt: "Democratic Club of Greater Tracy — content section",
        caption: "Member & event architecture",
      },
    ],
  },

  "spur-restaurant": {
    slug: "spur-restaurant",
    title: "Spur Restaurant & Bar",
    industry: "Hospitality",
    scope: ["Luxury Website Experiences"],
    tagline: "A restaurant presence as considered as the atmosphere inside.",
    url: "https://spurrestaurantandbar.com",
    status: "Live",
    year: "2026",
    image: "/migrated-assets/case-studies/spur-restaurant/hero.webp",
    context:
      "Spur Restaurant & Bar was built on local reputation and genuine atmosphere — the kind of place that earns loyalty through the quality of the experience, not the size of the marketing budget. The room was right. The website wasn't doing it justice.",
    challenge:
      "A restaurant with real character and local credibility was being introduced online by a presence that didn't reflect either. The digital first impression was creating the wrong expectation — or no expectation at all — before guests arrived.",
    strategy:
      "The website had to feel like the room. Not describe it — feel like it. The design language, tone, and content hierarchy were all built around the same atmosphere the restaurant creates inside: warm, specific, worth the drive.",
    execution: [
      "Character-driven web presence — design that communicates the restaurant's atmosphere before a guest reads a word.",
      "Reservation and inquiry flow — low-friction pathways built to move interest into bookings.",
    ],
    qualitativeOutcomes: [
      "Digital presence that reflects the care put into the physical space",
      "First impression that creates the right expectation before arrival",
      "Reservation-oriented architecture that reduces friction from interest to booking",
    ],
    whyItWorked:
      "Restaurants succeed on atmosphere. The website had to deliver a version of that before the door opens. It works because the design was built around that single goal — not built around what a restaurant website is supposed to look like.",
    showcaseImages: [
      {
        src: "/migrated-assets/case-studies/spur-restaurant/hero.webp",
        alt: "Spur Restaurant & Bar — homepage hero",
        caption: "Character-driven entrance",
      },
      {
        src: "/migrated-assets/case-studies/spur-restaurant/homepage-02.webp",
        alt: "Spur Restaurant & Bar — interior sections",
        caption: "Reservation pathways",
      },
    ],
  },

  "golden-state-warriors": {
    slug: "golden-state-warriors",
    title: "Golden State Warriors",
    industry: "NBA / Sports",
    scope: ["Brand Systems & Identity"],
    tagline: "Creative support for one of the most recognized brands in professional sports.",
    url: "https://www.nba.com/warriors",
    status: "Completed",
    year: "2024",
    image: "/images/work/screenshots/golden-state-warriors/desktop-home.png",
    context:
      "The Golden State Warriors in-house creative team operates at a pace and scale most studios never encounter. Tight timelines, high-profile deliverables, and a brand standard that leaves no room for anything less than exceptional.",
    challenge:
      "Supporting an in-house team means adapting to existing workflows, brand systems, and approval chains — without disrupting the machine. The goal isn't to reinvent anything. It's to deliver work that belongs.",
    strategy:
      "Embed, align, and execute. Understand the brand architecture before touching the brief. Every output needed to feel like it was made by the team, not dropped in from outside.",
    execution: [
      "Design support aligned to the Warriors' existing brand system and creative standards.",
      "Execution across digital and print touchpoints under in-house creative leadership.",
    ],
    qualitativeOutcomes: [
      "Creative deliverables that met the Warriors' brand standard",
      "Seamless integration with the in-house team's workflow",
    ],
    whyItWorked:
      "Knowing when to lead and when to support is a skill. This engagement required the latter — and delivering it well is what made the work worth doing.",
    showcaseImages: [
      {
        src: "/images/work/screenshots/golden-state-warriors/desktop-home.png",
        alt: "Golden State Warriors — creative support engagement",
        caption: "In-house creative support",
      },
    ],
  },

  "sbe-hyde-lounge": {
    slug: "sbe-hyde-lounge",
    title: "SBE / Hyde Lounge",
    industry: "Hospitality",
    scope: ["Luxury Website Experiences"],
    tagline: "A nightlife experience that translates from the velvet rope to the browser.",
    url: "https://www.sbe.com/nightlife/hyde/lounge-crypto-arena/",
    status: "Completed",
    year: "2024",
    image: "/images/work/screenshots/sbe-hyde-lounge/desktop-home.png",
    context:
      "Hyde Lounge at Crypto.com Arena is one of LA's most recognizable nightlife venues — operating at the intersection of sports, entertainment, and hospitality. SBE demanded a digital presence that carried that weight.",
    challenge:
      "Translating the sensory experience of a premium nightlife venue into a digital format is genuinely hard. Too much and it becomes overwhelming. Too little and it loses the room entirely.",
    strategy:
      "The web experience had to feel like the approach to the venue — anticipation before arrival. Every visual and copy decision was made to build that feeling, not just describe the space.",
    execution: [
      "Digital presence aligned to SBE's luxury hospitality brand standards.",
      "Content and visual direction built around the atmosphere and clientele of Hyde Lounge.",
    ],
    qualitativeOutcomes: [
      "Premium digital presence aligned with SBE's luxury hospitality portfolio",
      "Experience that communicates the venue's character before a guest arrives",
    ],
    whyItWorked:
      "Nightlife brands sell a feeling. The digital experience worked because it was built to create that feeling first — not to list features or show floorplans.",
    showcaseImages: [
      {
        src: "/images/work/screenshots/sbe-hyde-lounge/desktop-home.png",
        alt: "SBE / Hyde Lounge — digital presence",
        caption: "Premium venue experience",
      },
    ],
  },

  "on-track-performance": {
    slug: "on-track-performance",
    title: "On Track Performance",
    industry: "Motorsports",
    scope: ["Luxury Website Experiences"],
    tagline: "Performance-forward digital presence for a motorsports business built on precision.",
    url: "https://on-track-performance.com",
    status: "Live",
    year: "2024",
    image: "/images/work/screenshots/on-track-performance/desktop-home.png",
    context:
      "On Track Performance serves a customer who knows the difference. Whether it's track preparation, alignment, or suspension work — the clients who walk through the door have standards. The website had to meet them.",
    challenge:
      "Automotive performance shops tend to look the same — loud, cluttered, aimed at everyone. The goal was a site that looked like a shop that turns away work it doesn't want.",
    strategy:
      "Precision over volume. The design language had to reflect the shop's actual standards — sharp, clean, and built for the client who already knows what they need.",
    execution: [
      "Performance-aligned website built for a motorsports audience that values precision.",
      "Content architecture that communicates capability without overselling.",
    ],
    qualitativeOutcomes: [
      "Digital presence that reflects the shop's performance standards",
      "First impression that attracts the right client profile",
    ],
    whyItWorked:
      "Specificity is a filter. A site that looks like it was built for serious motorsports clients attracts serious motorsports clients. That was the goal — and the outcome.",
    showcaseImages: [
      {
        src: "/images/work/screenshots/on-track-performance/desktop-home.png",
        alt: "On Track Performance — homepage",
        caption: "Performance-aligned digital presence",
      },
    ],
  },

  "dialed-in-electric": {
    slug: "dialed-in-electric",
    title: "Dialed In Electric",
    industry: "Electrical / Trades",
    scope: ["Luxury Website Experiences"],
    tagline: "A trades business that looks as sharp as the work it delivers.",
    url: "https://dialedinelectric.com",
    status: "Live",
    year: "2025",
    image: null,
    logo: "/migrated-assets/logos/dialed-in-electric.svg",
    context:
      "Dialed In Electric is a trades business that holds itself to a higher standard — in the quality of the work and the professionalism of every touchpoint. The digital presence had to match.",
    challenge:
      "Most trades websites look like they were built in 2009. Dialed In needed something that communicated the same precision and care that the business puts into every job.",
    strategy:
      "Brand forward, jargon free. The design had to communicate trust and competence — not through feature lists, but through the quality of the presentation itself.",
    execution: [
      "Premium digital presence for a trades business building a reputation on quality.",
      "Brand-aligned design that elevates the client's positioning in a crowded market.",
    ],
    qualitativeOutcomes: [
      "Digital presence that stands apart from every other trades website",
      "First impression that communicates precision and reliability",
    ],
    whyItWorked:
      "The best trades businesses win on trust. A website that looks like it was built with the same care as the work itself is a trust signal before anyone reads a word.",
    showcaseImages: [],
  },

  "hair-mafia": {
    slug: "hair-mafia",
    title: "Hair Mafia",
    industry: "Beauty / Salon",
    scope: ["Luxury Website Experiences", "Brand Systems & Identity"],
    tagline: "A salon brand with the confidence and craft to own the room.",
    url: "https://hairmafiasalon.com",
    status: "Live",
    year: "2026",
    image: null,
    context:
      "Hair Mafia is a premium salon built on artistry, reputation, and a clear point of view. The clientele is loyal because the standard is consistent. What the brand needed was a digital presence that carried the same energy as the salon itself — sharp, confident, and unmistakably theirs.",
    challenge:
      "A salon with a strong identity and a committed following was being introduced online by a presence that didn't match either. The website didn't communicate the brand's character or quality — and in an industry where first impressions decide bookings, that gap was costing the salon clients it should have earned.",
    strategy:
      "Personality first, services second. The digital experience had to feel like the salon — confident, precise, and built for someone who already knows what they want. Content hierarchy was built around the brand's character, not its service menu. The goal: attract clients who are the right fit before they've walked in the door.",
    execution: [
      "Brand-forward web presence — a digital introduction that communicates the salon's identity and standard before a single service is listed.",
      "Booking and inquiry pathways — low-friction architecture built to convert qualified interest into direct appointments.",
      "Visual and copy system — consistent brand language that carries the salon's character across every touchpoint.",
    ],
    qualitativeOutcomes: [
      "Digital presence that reflects the salon's artistry and point of view",
      "Brand-aligned first impression that attracts the right clientele",
      "Inquiry experience that converts interest into bookings without disrupting the brand",
      "Foundation that grows with the salon's reputation",
    ],
    whyItWorked:
      "The best salons earn loyalty through consistency. The website works because it's specific — built for the client who already has taste, and wants to trust the person holding the scissors. That kind of specificity is the strategy.",
    showcaseImages: [
      {
        src: "/migrated-assets/case-studies/hair-mafia/hero.webp",
        alt: "Hair Mafia — homepage hero",
        caption: "Brand-forward presence",
      },
      {
        src: "/migrated-assets/case-studies/hair-mafia/homepage-02.webp",
        alt: "Hair Mafia — salon experience",
        caption: "Booking pathways",
      },
    ],
  },
};

