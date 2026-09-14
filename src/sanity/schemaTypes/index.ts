import type { SchemaTypeDefinition } from "sanity";

import mediaBox from "./mediaBox";
import product from "./product";
import collection from "./collection";
import siteSettings from "./siteSettings";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [mediaBox, product, collection, siteSettings],
};
