import { defineField, defineType } from "sanity";

/**
 * Price and stock exist from day one so a future cart/checkout phase
 * doesn't require restructuring this schema (see CLAUDE.md — "محدوده‌ی
 * نسخه‌ی اول"). No purchase logic is built in this phase.
 */
export default defineType({
  name: "product",
  title: "Product",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "images",
      title: "Images",
      type: "array",
      of: [{ type: "mediaBox" }],
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: "price",
      title: "Price",
      type: "number",
      description: "Price in Iranian Toman.",
      validation: (Rule) => Rule.required().positive(),
    }),
    defineField({
      name: "inStock",
      title: "In stock",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "stockCount",
      title: "Stock count",
      type: "number",
      description: "Optional exact inventory count.",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "collection",
      title: "Collection",
      type: "reference",
      to: [{ type: "collection" }],
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "price",
      media: "images.0.image",
    },
    prepare({ title, subtitle, media }) {
      return {
        title,
        subtitle: subtitle ? `${subtitle} تومان` : undefined,
        media,
      };
    },
  },
});
