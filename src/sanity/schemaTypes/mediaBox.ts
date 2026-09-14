import { defineField, defineType } from "sanity";

/**
 * Reusable image/video object consumed by the MediaBox React component
 * (see src/components/MediaBox.tsx). Swapping `type` from "image" to
 * "video" in Studio is meant to change the rendered media with no code
 * changes.
 */
export default defineType({
  name: "mediaBox",
  title: "Media Box",
  type: "object",
  fields: [
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "Image", value: "image" },
          { title: "Video", value: "video" },
        ],
        layout: "radio",
      },
      initialValue: "image",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      hidden: ({ parent }) => parent?.type !== "image",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { type?: string };
          if (parent?.type === "image" && !value) {
            return "Image is required when type is Image";
          }
          return true;
        }),
    }),
    defineField({
      name: "video",
      title: "Video file",
      type: "file",
      options: { accept: "video/*" },
      hidden: ({ parent }) => parent?.type !== "video",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { type?: string };
          if (parent?.type === "video" && !value) {
            return "Video file is required when type is Video";
          }
          return true;
        }),
    }),
    defineField({
      name: "alt",
      title: "Alternative text",
      type: "string",
      description: "Important for accessibility and SEO.",
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { type: "type", media: "image", alt: "alt" },
    prepare({ type, media, alt }) {
      return {
        title: alt || "Media Box",
        subtitle: type === "video" ? "Video" : "Image",
        media,
      };
    },
  },
});
