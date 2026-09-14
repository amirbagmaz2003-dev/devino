import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "../env";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // Static, cacheable data for the marketing site — no draft/preview
  // content needed yet. Revisit once previews are wired up.
  useCdn: true,
});
