import type { StructureResolver } from "sanity/structure";

// Pins Site Settings as a singleton entry and hides it from the generic
// document-type list so editors can't accidentally create a second copy.
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Site Settings")
        .id("siteSettings")
        .child(
          S.document().schemaType("siteSettings").documentId("siteSettings"),
        ),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (listItem) => listItem.getId() !== "siteSettings",
      ),
    ]);
