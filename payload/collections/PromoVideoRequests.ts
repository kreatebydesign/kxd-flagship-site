import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const PromoVideoRequests: CollectionConfig = {
  slug: "promo-video-requests",
  labels: { singular: "Promo Video Request", plural: "Promo Video Requests" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "videoTitle",
    defaultColumns: ["videoTitle", "client", "videoType", "status", "priority", "deadline"],
    group: PAYLOAD_GROUPS.creativeEngine,
    description: "High-end KXD promo videos, site launch reels, highlight edits, and client showcase content.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        // ── Brief ─────────────────────────────────────────────────────────────
        {
          label: "Brief",
          fields: [
            { name: "videoTitle",     type: "text", required: true, label: "Video Title" },
            { name: "client",         type: "relationship", relationTo: "clients",            required: true, label: "Client" },
            { name: "relatedProject", type: "relationship", relationTo: "client-projects",    label: "Related Project" },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { name: "relatedCampaign",type: "relationship", relationTo: "creative-campaigns" as any, label: "Related Campaign" },
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              name: "brandKit", type: "relationship", relationTo: "brand-kits" as any, label: "Brand Kit",
              admin: { description: "Brand kit supplying visual direction for this video." },
            },
            {
              name: "videoType",
              type: "select",
              label: "Video Type",
              options: [
                { label: "Website Launch",    value: "website-launch" },
                { label: "Case Study",        value: "case-study" },
                { label: "Promo",             value: "promo" },
                { label: "Highlight Reel",    value: "highlight-reel" },
                { label: "Event Recap",       value: "event-recap" },
                { label: "Product / Service", value: "product-service" },
                { label: "Testimonial",       value: "testimonial" },
                { label: "Before & After",    value: "before-after" },
                { label: "Social Reel",       value: "social-reel" },
                { label: "Other",             value: "other" },
              ],
            },
            {
              name: "platform",
              type: "select",
              label: "Platform",
              options: [
                { label: "Instagram Reel", value: "instagram-reel" },
                { label: "Facebook Reel",  value: "facebook-reel" },
                { label: "TikTok",         value: "tiktok" },
                { label: "LinkedIn",       value: "linkedin" },
                { label: "Facebook",       value: "facebook" },
                { label: "Instagram",      value: "instagram" },
                { label: "Reels",          value: "reels" },
                { label: "Stories",        value: "stories" },
                { label: "YouTube",        value: "youtube" },
                { label: "Website",        value: "website" },
                { label: "Other",          value: "other" },
              ],
            },
            {
              name: "aspectRatio",
              type: "select",
              label: "Aspect Ratio",
              options: [
                { label: "9:16 (Vertical)", value: "9:16" },
                { label: "1:1 (Square)",    value: "1:1" },
                { label: "4:5",             value: "4:5" },
                { label: "16:9 (Landscape)",value: "16:9" },
                { label: "Custom",          value: "custom" },
              ],
            },
            {
              name: "durationTarget",
              type: "select",
              label: "Duration Target",
              options: [
                { label: "15 seconds", value: "15s" },
                { label: "30 seconds", value: "30s" },
                { label: "45 seconds", value: "45s" },
                { label: "60 seconds", value: "60s" },
                { label: "90 seconds", value: "90s" },
                { label: "Custom",     value: "custom" },
              ],
            },
            {
              name: "visualStyle",
              type: "select",
              label: "Visual Style",
              options: [
                { label: "Cinematic",     value: "cinematic" },
                { label: "Luxury",        value: "luxury" },
                { label: "Editorial",     value: "editorial" },
                { label: "Launch Reveal", value: "launch-reveal" },
                { label: "Case Study",    value: "case-study" },
                { label: "Energetic",     value: "energetic" },
                { label: "Minimal",       value: "minimal" },
                { label: "Bold",          value: "bold" },
                { label: "Documentary",   value: "documentary" },
                { label: "Other",         value: "other" },
              ],
            },
            { name: "goal",       type: "textarea", label: "Goal" },
            { name: "audience",   type: "text",     label: "Target Audience" },
            { name: "deadline",   type: "date",     label: "Deadline", admin: { date: { pickerAppearance: "dayOnly" } } },
          ],
        },

        // ── Assets Needed ─────────────────────────────────────────────────────
        {
          label: "Assets Needed",
          fields: [
            {
              name: "websiteUrl",
              type: "text",
              label: "Website URL",
              admin: { description: "URL used for automated screenshot capture and reel storyboard generation." },
            },
            { name: "clientName",          type: "text",     label: "Client Name (override)", admin: { description: "Display name to use if client record differs from website branding." } },
            { name: "requiredScreenshots", type: "textarea", label: "Required Screenshots / Notes" },
            { name: "requiredClips",       type: "textarea", label: "Required Clips / Footage" },
            { name: "musicDirection",      type: "textarea", label: "Music Direction" },
            { name: "shotList",            type: "textarea", label: "Shot List" },
            // ── Phase 5A: Reel screenshot capture ─────────────────────────────
            {
              name: "capturedScreenshots",
              type: "relationship",
              relationTo: "media",
              hasMany: true,
              label: "Captured Screenshots",
              admin: {
                description: "Screenshots automatically captured from the website URL. Populated by the Screenshot Capture action.",
              },
            },
            {
              name: "screenshotStatus",
              type: "select",
              label: "Screenshot Status",
              defaultValue: "idle",
              options: [
                { label: "Idle",      value: "idle" },
                { label: "Capturing", value: "capturing" },
                { label: "Complete",  value: "complete" },
                { label: "Failed",    value: "failed" },
              ],
            },
            {
              name: "screenshotError",
              type: "text",
              label: "Screenshot Error",
              admin: { description: "Error message from the last screenshot capture attempt." },
            },
            {
              name: "screenshotsCapturedAt",
              type: "date",
              label: "Screenshots Captured At",
              admin: { date: { pickerAppearance: "dayAndTime" } },
            },
          ],
        },

        // ── Generated Content ─────────────────────────────────────────────────
        {
          label: "Generated Content",
          admin: { description: "AI-generated reel storyboard, script, and copy — brand-aware KXD output." },
          fields: [
            { name: "generatedScript",       type: "textarea", label: "Generated Script / Storyboard" },
            { name: "generatedCaptions",     type: "textarea", label: "Generated Captions" },
            { name: "generatedOnScreenText", type: "textarea", label: "Generated On-Screen Text" },
            { name: "generatedPostCopy",     type: "textarea", label: "Generated Post Copy" },
            // ── Phase 5A: Reel storyboard fields ──────────────────────────────
            {
              name: "reelTitle",
              type: "text",
              label: "Reel Title",
              admin: { description: "Generated reel title — hook-forward, platform-native." },
            },
            {
              name: "reelHook",
              type: "textarea",
              label: "Reel Hook",
              admin: { description: "Opening hook — first 3 seconds. Stops the scroll." },
            },
            {
              name: "sceneSequence",
              type: "textarea",
              label: "Scene Sequence",
              admin: { description: "Full scene-by-scene storyboard with timing, transitions, and on-screen text." },
            },
            {
              name: "transitionStyle",
              type: "text",
              label: "Transition Style",
              admin: { description: "Recommended transition direction and style (e.g. 'Seamless cut → whip pan → fade to black')." },
            },
            {
              name: "captionOptions",
              type: "textarea",
              label: "Caption Options",
              admin: { description: "3 caption variants for A/B testing — hook-driven, results-forward, and curiosity-gap." },
            },
            {
              name: "ctaText",
              type: "text",
              label: "CTA Text",
              admin: { description: "On-screen and caption CTA — specific and actionable." },
            },
            {
              name: "storyboardGenerationStatus",
              type: "select",
              label: "Storyboard Generation Status",
              defaultValue: "idle",
              options: [
                { label: "Idle",       value: "idle" },
                { label: "Generating", value: "generating" },
                { label: "Complete",   value: "complete" },
                { label: "Failed",     value: "failed" },
              ],
            },
            {
              name: "storyboardGeneratedAt",
              type: "date",
              label: "Storyboard Generated At",
              admin: { date: { pickerAppearance: "dayAndTime" } },
            },
            {
              name: "storyboardGenerationError",
              type: "text",
              label: "Generation Error",
              admin: { description: "Error from the last storyboard generation attempt." },
            },
            {
              name: "storyboardPrompt",
              type: "textarea",
              label: "Generation Prompt (debug)",
              admin: { description: "Full assembled prompt sent to the AI. For internal review only." },
            },
          ],
        },

        // ── Internal ──────────────────────────────────────────────────────────
        {
          label: "Internal",
          fields: [
            { name: "editingNotes",      type: "textarea", label: "Editing Notes" },
            { name: "internalNotes",     type: "textarea", label: "Internal Notes" },
            { name: "nextAction",        type: "text",     label: "Next Action" },
            { name: "nextActionDueDate", type: "date",     label: "Next Action Due", admin: { date: { pickerAppearance: "dayOnly" } } },
          ],
        },
      ],
    },

    // ── Sidebar ───────────────────────────────────────────────────────────────
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "new",
      options: [
        { label: "New",           value: "new" },
        { label: "Storyboarding", value: "storyboarding" },
        { label: "Scripting",     value: "scripting" },
        { label: "Assets Needed", value: "assets-needed" },
        { label: "Editing",       value: "editing" },
        { label: "Review",        value: "review" },
        { label: "Approved",      value: "approved" },
        { label: "Delivered",     value: "delivered" },
        { label: "Archived",      value: "archived" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "priority",
      type: "select",
      defaultValue: "normal",
      options: [
        { label: "Low",    value: "low" },
        { label: "Normal", value: "normal" },
        { label: "High",   value: "high" },
        { label: "Urgent", value: "urgent" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "isWebsiteReel",
      type: "checkbox",
      label: "Website Showcase Reel",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "Marks this record as a website showcase reel — surfaces it in the Reels Generator dashboard.",
      },
    },
  ],
};
