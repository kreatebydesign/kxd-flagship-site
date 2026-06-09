// ── Types ────────────────────────────────────────────────────────────────────

export type InsightCategory = {
  value: string;
  label: string;
};

export type InsightPreview = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  categoryLabel: string;
  author: string;
  publishedAt: string; // ISO date string
  readingTime: number; // minutes
  featured: boolean;
};

export type InsightDetail = InsightPreview & {
  body: string[]; // paragraphs for static content
  payloadContent?: unknown; // Lexical JSON when sourced from CMS
};

// ── Categories ────────────────────────────────────────────────────────────────

export const INSIGHT_CATEGORIES: InsightCategory[] = [
  { value: "luxury-web-design",   label: "Luxury Web Design" },
  { value: "operational-systems", label: "Operational Systems" },
  { value: "hospitality-growth",  label: "Hospitality Growth" },
  { value: "motorsports-strategy",label: "Motorsports Strategy" },
  { value: "brand-systems",       label: "Brand Systems" },
  { value: "founder-perspectives",label: "Founder Perspectives" },
];

export function getCategoryLabel(value: string): string {
  return INSIGHT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

// ── Static Insights ───────────────────────────────────────────────────────────

export const STATIC_INSIGHTS: InsightDetail[] = [

  // ── Luxury Web Design ──────────────────────────────────────────────────────

  {
    slug: "why-your-website-is-losing-premium-clients",
    title: "Why Your Website Is Losing Premium Clients Before They Reach Out",
    excerpt:
      "Premium buyers make trust decisions in seconds. If your website signals the wrong price point, they've already gone elsewhere before reading a word.",
    category: "luxury-web-design",
    categoryLabel: "Luxury Web Design",
    author: "Matt Kreate",
    publishedAt: "2026-01-14",
    readingTime: 5,
    featured: true,
    body: [
      "The premium buyer reads websites differently. They're not looking for information — they're looking for signals. Every design choice communicates a price point, a level of seriousness, a category of business. Most websites fail this test in the first three seconds.",
      "Template websites are particularly damaging for premium brands. Not because they look bad in any absolute sense, but because they look like everyone else. The moment a high-value buyer recognizes a template, they've placed you in a category that includes every business that couldn't invest in their own presence. That's not the company you want to be in.",
      "Performance is another silent filter. A site that loads in four seconds won't register as a technical problem to the person visiting — they'll just experience a vague sense of disorganization. Premium buyers aren't conscious of page speed. They just don't wait.",
      "The copy problem is subtler. Generic headlines — \"We help businesses grow,\" \"Your success is our mission\" — don't signal expertise, they signal that no one has done the hard work of saying something specific. Premium buyers have been burned before. They're looking for evidence of thinking.",
      "A premium website doesn't just present your business. It does a specific job: making the right kind of person feel like they're in exactly the right place. Every decision — the whitespace, the typography, the absence of things as much as the presence of things — is in service of that moment of recognition. That's the work.",
    ],
  },

  {
    slug: "architecture-of-a-premium-web-project",
    title: "The Architecture of a Premium Web Project: What You're Actually Paying For",
    excerpt:
      "The gap between a $5,000 website and a $50,000 one isn't a matter of aesthetics. It's strategy, architecture, and the cost of doing the work properly.",
    category: "luxury-web-design",
    categoryLabel: "Luxury Web Design",
    author: "Matt Kreate",
    publishedAt: "2026-02-03",
    readingTime: 6,
    featured: false,
    body: [
      "A common misconception about premium web projects is that you're paying for design. Design is part of it — but design is the visible surface of something much deeper. What you're actually paying for is thinking: the hard, time-consuming work of understanding your business well enough to make decisions on its behalf.",
      "Strategy comes first. Before a single wireframe is drawn, there's a research phase: understanding who you're actually trying to reach, what decision they're trying to make, what information they need to make it, and what would make them hesitate. A $5,000 project skips this. That's not a criticism — it's a scope decision. But it's also why the results are different.",
      "Architecture is what makes a website work as a system rather than a collection of pages. Navigation decisions, information hierarchy, how pages relate to each other — these are the decisions that determine whether someone who lands on your site finds what they need or bounces. Getting them right requires experience. Getting them right for your specific business requires time.",
      "Performance, accessibility, and technical quality are expensive to maintain at a high level. They require people who care about them and processes that protect them throughout a project. These aren't vanity metrics — they're the infrastructure that search engines reward and users respond to, even when they can't articulate why.",
      "Finally, there's what a premium project produces beyond the website itself: clarity. Clients consistently report that the process of building a premium web presence forced them to get clear on things about their own business that had been vague for years. That clarity has compounding returns — it shows up in conversations, proposals, and hiring, not just on the site.",
    ],
  },

  // ── Operational Systems ────────────────────────────────────────────────────

  {
    slug: "when-your-business-has-outgrown-its-tools",
    title: "The Inflection Point: When Your Business Has Outgrown Its Tools",
    excerpt:
      "There's a moment when the tools that helped you grow start holding you back. Recognizing it early is the difference between a clean evolution and an expensive crisis.",
    category: "operational-systems",
    categoryLabel: "Operational Systems",
    author: "Matt Kreate",
    publishedAt: "2026-01-28",
    readingTime: 5,
    featured: false,
    body: [
      "Every fast-growing business hits a point where its operational infrastructure becomes the bottleneck. The tools that worked at $500K aren't designed for $5M. The spreadsheet that made sense for a team of four is a liability at twenty. The question isn't whether this happens — it's whether you see it coming.",
      "The symptoms are consistent, even if the specifics vary by industry. Decisions that used to take minutes are taking hours because someone needs to pull data from three different places. New team members take weeks to get up to speed because the knowledge of how things work is distributed across Slack threads, inboxes, and individual memory. Reporting requires a person, not a dashboard.",
      "The instinct is usually to add another tool. This is how businesses end up with stacks of twelve platforms that technically work but never actually work together. Adding tools is fast; building systems is slow. The problem is that the fast fix compounds the underlying issue.",
      "What 'outgrowing your tools' actually signals is a business that's been successful enough to expose the limits of its operational infrastructure. That's a good problem — but it requires a fundamentally different response than adding a subscription. It requires mapping how the work actually flows and building infrastructure that matches that reality.",
      "The businesses that navigate this well treat it as an architectural problem, not a tools problem. The question shifts from 'what's the best project management software?' to 'what does our team actually need to see, when, and why?' The answer to that question determines everything else.",
    ],
  },

  {
    slug: "what-disconnected-tools-are-costing-you",
    title: "What Disconnected Tools Are Actually Costing You",
    excerpt:
      "The true cost of a fragmented operational stack isn't just inefficiency — it's visibility, decisions, and the compounding weight of information that lives nowhere in particular.",
    category: "operational-systems",
    categoryLabel: "Operational Systems",
    author: "Matt Kreate",
    publishedAt: "2026-02-18",
    readingTime: 4,
    featured: false,
    body: [
      "There's a calculation most businesses never make: the real cost of operating on disconnected tools. Not just in subscription fees, but in time, decisions, and the quality of information available to people who need to act on it. When you add it up, the number is usually surprising.",
      "Visibility is the first casualty. When data lives in multiple systems that don't communicate, getting a clear picture of the business requires an act of will. Someone has to gather it, reconcile it, and present it in a form that's actually usable. That someone is usually a person who should be doing something else.",
      "Decision quality suffers next. Good decisions require good information. When information is scattered or simply unavailable in the moment a decision needs to be made, people rely on instinct, memory, and guesswork. Over time, this calcifies into a culture where important things are decided based on incomplete data.",
      "Onboarding cost is the hidden expense nobody tracks. When operational knowledge is distributed across tools, platforms, and individual memory rather than captured in systems, every new team member starts from near zero. The hours spent getting people up to speed represent a significant ongoing cost that compounds as teams grow.",
      "The real cost is strategic optionality. Businesses with poor operational visibility can't move quickly when they need to. They can't run analyses that would surface opportunities. They can't delegate confidently because the information required to delegate well doesn't exist in accessible form. Disconnected tools aren't just inefficient — they're a strategic constraint.",
    ],
  },

  // ── Hospitality Growth ─────────────────────────────────────────────────────

  {
    slug: "why-independent-hospitality-losing-to-chains-online",
    title: "Why Independent Hospitality Brands Are Losing to Chains Online",
    excerpt:
      "Chain hospitality brands have massive digital infrastructure advantages. But independent properties have something more powerful — and most of them aren't using it.",
    category: "hospitality-growth",
    categoryLabel: "Hospitality Growth",
    author: "Matt Kreate",
    publishedAt: "2026-01-07",
    readingTime: 5,
    featured: false,
    body: [
      "Independent hospitality has a genuine competitive advantage over chains: specificity. A boutique lodge, a regional culinary destination, a locally owned resort — these brands can offer something no Marriott can match: a particular place, with a particular character, in a particular moment of someone's life. The problem is that most independent properties communicate this advantage about as effectively as their chain competitors communicate the opposite.",
      "Search is where the gap is most visible. Chain brands have teams, budgets, and decades of accumulated domain authority. Independent properties are competing with a single website, often built on a template, often not updated in two years, often optimized for what the owner wanted to say rather than what their ideal guest is searching for. The gap in resources is real — but it's not the whole story.",
      "The conversion problem is often more fixable than the discovery problem. A guest who arrives on your website has already expressed interest. What happens next — whether they book, leave, or stay and explore — is entirely within your control. Most independent hospitality websites lose potential guests at this stage to friction, clarity issues, or a mismatch between the impression created in discovery and the reality of the booking experience.",
      "The most effective independent hospitality brands have figured out something chains structurally cannot do: tell a true, specific, vivid story about place. Content that makes someone feel what it would be like to be there — the morning light, the particular character of the local food, the quality of the silence — is not something you can create from a brand standards manual.",
      "Digital infrastructure for independent hospitality isn't about matching chain resources. It's about maximizing the advantage you already have: authenticity, specificity, and the ability to create a genuine narrative that makes the right guest feel found. The question isn't how to compete with chains. It's how to attract the guests who are specifically looking for what you offer, and make sure they find you.",
    ],
  },

  {
    slug: "building-the-guest-experience-before-arrival",
    title: "Building the Guest Experience That Starts Before Arrival",
    excerpt:
      "The most memorable hospitality experiences don't begin at check-in. They begin the moment a guest decides to book — and the digital journey between that decision and arrival shapes everything that follows.",
    category: "hospitality-growth",
    categoryLabel: "Hospitality Growth",
    author: "Matt Kreate",
    publishedAt: "2026-03-01",
    readingTime: 4,
    featured: false,
    body: [
      "There's a moment in every hospitality decision when abstract interest becomes genuine anticipation. Someone finds your property, decides they want to go, and then lives with that anticipation for days or weeks before they arrive. What you do with that window — or don't do — significantly influences the quality of the experience they have.",
      "The confirmation email is almost universally underutilized. It arrives at peak anticipation, from someone who has just made a financial and emotional commitment to your property. Most confirmation emails are transactional receipts dressed in brand colors. The best ones are the beginning of a conversation — welcoming, specific, and already making the guest feel like they made the right choice.",
      "Pre-arrival communication is an opportunity most properties treat as a logistical necessity: parking instructions, check-in procedures, access codes. These are necessary — but they're not the ceiling. The moments between booking and arrival are an opportunity to build context, share what makes the property special, create anticipation for specific elements of the experience, and handle logistical questions before they become friction.",
      "Digital infrastructure that supports the pre-arrival journey requires design. Not just emails that look good — but a system that knows who a guest is, what they've booked, what their profile suggests about what they care about, and how to communicate in a way that feels personal. This is not complicated technology. But it requires deliberate architecture.",
      "The payoff for investing in the pre-arrival experience compounds. Guests who arrive already having had a positive interaction with your brand are warmer, more forgiving of minor friction, and more likely to engage positively with staff. They've already told themselves the story of a good experience. Your job on arrival is simply not to contradict it.",
    ],
  },

  // ── Motorsports Strategy ───────────────────────────────────────────────────

  {
    slug: "why-motorsports-brands-fail-digitally",
    title: "Why Motorsports Brands Fail Digitally — And What to Do About It",
    excerpt:
      "Motorsports organizations have some of the most devoted audiences in sport. Most of them have digital presences that have no idea what to do with that loyalty.",
    category: "motorsports-strategy",
    categoryLabel: "Motorsports Strategy",
    author: "Matt Kreate",
    publishedAt: "2025-12-10",
    readingTime: 5,
    featured: false,
    body: [
      "Motorsports builds loyalty unlike almost any other sector. Drivers, teams, and series accumulate audiences that follow careers, travel to events, and engage with content at a depth that most consumer brands spend decades trying to manufacture. The disconnect is that most motorsports organizations have digital presences designed to hold information rather than grow that loyalty.",
      "The website problem is specific. Most motorsports websites are news repositories with contact pages — built to communicate to people who are already engaged, not designed to bring in new audience, move that audience toward deeper engagement, or capture any of the commercial value of the attention they hold. This shows up in metrics: high direct traffic, low organic discovery, minimal email capture, no meaningful conversion path.",
      "Sponsor value is one of the clearest indicators of digital health. Sponsors increasingly want to see engaged, measurable audiences — not just impressions on a car or a banner at an event. Organizations that can demonstrate digital reach, audience quality, and meaningful engagement command different conversations. Most motorsports organizations can't demonstrate any of this in a form sponsors find credible.",
      "The opportunity is significant precisely because the baseline is low. A motorsports brand that treats its digital presence as seriously as its physical one — that invests in a site experience that converts interest to email, builds content that serves different audience segments, and creates a commercial structure around its digital assets — is operating in effectively uncrowded territory.",
      "The starting point isn't complexity. It's a question: who is our audience, what do they need from us between events, and what would they give us their attention and email address for? Answer that clearly, then build the infrastructure to deliver on it. What follows is usually simpler than organizations expect — and significantly more valuable.",
    ],
  },

  {
    slug: "year-round-motorsports-digital-presence",
    title: "From Race Day to Every Day: Building a Year-Round Motorsports Presence",
    excerpt:
      "Racing seasons are finite. The audience's relationship with the sport is not. The gap between these two realities is where most motorsports digital strategies fail.",
    category: "motorsports-strategy",
    categoryLabel: "Motorsports Strategy",
    author: "Matt Kreate",
    publishedAt: "2026-02-26",
    readingTime: 4,
    featured: false,
    body: [
      "Race seasons create natural content intensity — there are stories, results, and footage that practically generate themselves. But an audience relationship that only exists in-season is fragile. The organizations that build durable digital presence are the ones that have a strategy for between-event periods when there's no obvious content waiting to happen.",
      "The off-season is underrated as a digital opportunity. This is when the most motivated segments of a motorsports audience are in search mode — researching the upcoming season, following driver developments, seeking content that's harder to find than race coverage. Organizations that publish thoughtfully during this window build search authority and direct audience relationships that pay off when the season begins.",
      "Driver content is typically the most engaging asset motorsports organizations have and the least systematically developed. The human story behind the competition — the training, the decision-making, the preparation, the context that makes results meaningful — is the kind of content that builds genuine loyalty rather than passive following. Most organizations leave this almost entirely unmined.",
      "Enrollment and membership infrastructure is the most underleveraged commercial asset in motorsports. The audience is there, the engagement is deep, and the willingness to pay for access and recognition is real. Organizations that have built genuine membership experiences have created predictable, recurring revenue streams that aren't dependent on sponsorship cycles or event attendance.",
      "The digital presence that serves a motorsports organization year-round looks different from the one built to announce events. It has a content strategy that makes sense in July as well as October, an email program that maintains the audience relationship when there's nothing urgent to say, and conversion architecture that captures the commercial value of the attention the sport has already earned.",
    ],
  },

  // ── Brand Systems ──────────────────────────────────────────────────────────

  {
    slug: "brand-identity-vs-brand-system",
    title: "The Difference Between a Brand Identity and a Brand System",
    excerpt:
      "A logo is not a brand. A brand identity is not a brand system. Understanding the difference is the first step to building something that actually scales.",
    category: "brand-systems",
    categoryLabel: "Brand Systems",
    author: "Matt Kreate",
    publishedAt: "2026-01-21",
    readingTime: 5,
    featured: false,
    body: [
      "The word 'branding' has been compressed into meaning so many things that it sometimes means nothing. A logo. A color palette. A set of fonts. A brand guidelines PDF that gets used twice and then lives in a shared drive folder no one opens. These things are not nothing — but they're not a system.",
      "A brand identity is the visual and verbal expression of what a brand is: its name, mark, color, type, voice, and the basic rules for how these elements are used. It answers the question of what the brand looks like and sounds like. Done well, it's the foundation for everything else. Done as a deliverable rather than as strategic design, it's a collection of assets with no underlying logic.",
      "A brand system is the operational infrastructure that makes a brand consistent at scale. It includes the identity — but it also includes the frameworks, templates, component libraries, usage guidelines, and decision-making principles that allow different people, in different contexts, at different times, to produce work that still feels like the same brand. The difference is the difference between a building's aesthetics and its structural engineering.",
      "The absence of a brand system has predictable costs. Marketing materials lose coherence as teams grow. New hires spend time reinventing wheels that should have been documented. Vendor relationships are inefficient because there's no single source of truth. Brand drift — the slow erosion of distinctiveness as each individual makes slightly different choices — is invisible and constant.",
      "Organizations that have outgrown their brand identity need a brand system. The signal is usually visible before it's uncomfortable: a proliferation of slightly different logo versions, a lack of template consistency across channels, the feeling that the brand looks different depending on who's doing the work. The solution isn't more rules — it's better architecture.",
    ],
  },

  {
    slug: "brand-consistency-as-revenue-strategy",
    title: "Brand Consistency Is a Revenue Strategy, Not Just Good Design",
    excerpt:
      "Every inconsistency in your brand is a small tax on trust. At scale, that tax becomes a significant drag on conversion, retention, and pricing power.",
    category: "brand-systems",
    categoryLabel: "Brand Systems",
    author: "Matt Kreate",
    publishedAt: "2026-03-12",
    readingTime: 4,
    featured: false,
    body: [
      "Businesses treat brand consistency as a design preference when it's actually an operational and financial variable. Inconsistency in how a brand looks and communicates creates friction at every consumer touchpoint — and friction has costs that are measurable even when they're not attributed.",
      "Trust is the mechanism. Consistency builds familiarity, and familiarity lowers the perceived risk of a purchase decision. A brand that looks and sounds the same across your website, your emails, your social presence, and your physical materials signals that someone is paying attention — that there's a real organization behind this, not just a collection of templates. For premium brands especially, this signal is commercially significant.",
      "Pricing power is one of the clearest expressions of brand health. Brands that command premium prices do so in part because of the confidence their consistency creates. Customers pay more for things they trust. Trust is built through repeated, consistent experience. Every inconsistency is a small withdrawal from that account.",
      "The retention case is often underappreciated. Acquisition costs money. Retention is earned. Customers who feel a strong, consistent relationship with a brand churn at lower rates and respond better to upsell opportunities. Much of what drives that relationship is experiential — the feeling of being in capable hands, of dealing with an organization that knows what it's doing.",
      "Brand consistency isn't about rigidity or uniformity for its own sake. The best brand systems create consistency at the level of character and quality while allowing flexibility in execution. The goal isn't that everything looks identical — it's that everything feels like it comes from the same place. Building that kind of system requires investment. But the return — in trust, in pricing power, in customer retention — is compounding and durable.",
    ],
  },

  // ── Founder Perspectives ───────────────────────────────────────────────────

  {
    slug: "why-kxd-four-projects-a-year",
    title: "Why KXD Takes On Four Projects a Year, Not Forty",
    excerpt:
      "The easiest way to grow a studio is to take more projects. The hardest — and the only one worth doing — is to take fewer, better ones.",
    category: "founder-perspectives",
    categoryLabel: "Founder Perspectives",
    author: "Matt Kreate",
    publishedAt: "2026-02-10",
    readingTime: 5,
    featured: true,
    body: [
      "I've been asked some version of this question in almost every early conversation with a potential client: \"How many projects are you working on right now?\" I used to answer defensively, as if a small number implied some failure of demand. Now I answer with the same number and wait to see how they react — because their reaction tells me more about fit than almost anything else in that conversation.",
      "The logic for volume is obvious. More projects means more revenue. A studio that runs eight projects at once generates more than one that runs four. The short-term math works. The problem is that the work is different. A studio operating at capacity is managing rather than thinking. The quality ceiling is different when your creative energy is divided across eight engagements than when it's concentrated on four.",
      "The clients we serve best are the ones with genuinely complex problems. A luxury brand that needs to rethink its entire digital presence. A motorsports organization building operational infrastructure it's never had. A hospitality brand trying to compete against chains with a tenth of their resources. These aren't problems that benefit from efficient processing — they require sustained attention.",
      "The financial model for a quality-driven studio doesn't require volume. It requires margin. Four projects at the right price point — the price that reflects the actual depth of the work — produces more revenue, more satisfaction, and better outcomes than eight projects at the price that says yes to everyone. I learned this by doing it the wrong way first.",
      "What a limited capacity model forces — and this is what I've come to appreciate most about it — is selectivity. When you can't say yes to everyone, you have to be clear about who you're saying yes to and why. That clarity, maintained over time, becomes the thing that attracts the right clients in the first place. The portfolio gets more specific. The reputation becomes more defined. The kind of work you get offered starts to match the kind of work you want to do.",
    ],
  },

  {
    slug: "what-premium-actually-means-digital-studio",
    title: "What 'Premium' Actually Means in a Digital Studio",
    excerpt:
      "Premium isn't a price point. It's a commitment to a particular standard of thinking, execution, and honesty — especially when honesty is inconvenient.",
    category: "founder-perspectives",
    categoryLabel: "Founder Perspectives",
    author: "Matt Kreate",
    publishedAt: "2026-03-19",
    readingTime: 4,
    featured: true,
    body: [
      "The word 'premium' has been used to describe everything from a gym membership tier to a supermarket cheese selection. In the context of a digital studio, it's tempting to let it mean 'expensive' or 'visually refined' and leave it at that. But that's a poverty of definition that doesn't actually guide decisions when they need to be made.",
      "Premium, as I understand and practice it, starts with thinking. Every project we take on involves a genuine effort to understand the business, the market, the audience, and the problem before any visible work begins. This sounds obvious. In practice, many studios skip it — or do it at a surface level that's indistinguishable from the work it was supposed to replace. The difference shows, even when clients can't articulate why.",
      "Execution quality is the most visible component of premium, but it's a result, not a cause. The reason KXD's work looks the way it does isn't primarily aesthetic discipline — it's the clarity that comes from doing the strategic work well. When you know what a project needs to accomplish and for whom, design decisions become easier to make and defend. Execution quality follows from strategic clarity.",
      "Honesty is the component that's most uncomfortable and most essential. Premium service means telling clients things they don't want to hear when those things are true. It means saying 'this approach isn't right for your audience' when the client has already fallen in love with it. Studios that optimize for client comfort over client outcomes aren't premium — they're pleasant.",
      "Premium is ultimately a commitment to outcomes over outputs. A deliverable that's technically excellent but doesn't accomplish what it needed to accomplish is not premium work. The measure isn't whether the thing we built is beautiful or technically sophisticated — it's whether it worked. That standard is harder to maintain, requires more honesty, and produces genuinely better results. That's what I mean when I use the word.",
    ],
  },

];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getInsightBySlug(slug: string): InsightDetail | undefined {
  return STATIC_INSIGHTS.find((a) => a.slug === slug);
}

export function getRelatedInsights(
  slug: string,
  category: string,
  limit = 3,
): InsightPreview[] {
  return STATIC_INSIGHTS.filter(
    (a) => a.slug !== slug && a.category === category,
  ).slice(0, limit);
}

export function formatInsightDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
