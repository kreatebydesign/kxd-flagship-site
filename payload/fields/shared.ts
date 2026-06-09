import type { Field } from "payload";

export const slugField = (fieldToUse = "title"): Field => ({
  name: "slug",
  type: "text",
  required: true,
  unique: true,
  index: true,
  admin: {
    position: "sidebar",
    description: "URL-safe identifier. Auto-generated from title when left empty on create.",
  },
  hooks: {
    beforeValidate: [
      ({ data, value, operation }) => {
        if (value) return value;
        if (operation !== "create" && operation !== "update") return value;

        const source = data?.[fieldToUse];
        if (typeof source !== "string" || !source.trim()) return value;

        return source
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");
      },
    ],
  },
});

export const seoFields: Field[] = [
  {
    name: "seo",
    type: "group",
    label: "SEO",
    admin: {
      description: "Search and social metadata for this entry.",
    },
    fields: [
      {
        name: "title",
        type: "text",
        label: "Meta title",
        admin: {
          description: "Overrides default title. Keep under 60 characters.",
        },
      },
      {
        name: "description",
        type: "textarea",
        label: "Meta description",
        admin: {
          description: "Keep under 160 characters.",
        },
      },
      {
        name: "keywords",
        type: "text",
        label: "Focus keywords",
        admin: {
          description: "Comma-separated. Internal reference only.",
        },
      },
      {
        name: "canonicalUrl",
        type: "text",
        label: "Canonical URL",
        admin: {
          description: "Leave empty to use the default canonical for this entry.",
        },
      },
      {
        name: "noIndex",
        type: "checkbox",
        label: "No index",
        defaultValue: false,
      },
      {
        name: "ogImage",
        type: "upload",
        relationTo: "media",
        label: "Open Graph image",
      },
    ],
  },
];

export const publishedAtField: Field = {
  name: "publishedAt",
  type: "date",
  admin: {
    position: "sidebar",
    date: {
      pickerAppearance: "dayAndTime",
    },
  },
};

export const featuredField: Field = {
  name: "featured",
  type: "checkbox",
  defaultValue: false,
  admin: {
    position: "sidebar",
    description: "Surfaces this entry in homepage and featured modules.",
  },
};

export const statusField: Field = {
  name: "status",
  type: "select",
  defaultValue: "draft",
  required: true,
  options: [
    { label: "Draft", value: "draft" },
    { label: "Published", value: "published" },
    { label: "Archived", value: "archived" },
  ],
  admin: {
    position: "sidebar",
  },
};
