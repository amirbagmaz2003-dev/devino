import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { apiVersion, dataset, projectId } from "./src/sanity/env";
import { schema } from "./src/sanity/schemaTypes";
import { structure } from "./src/sanity/structure";

// Studio runs standalone via the Sanity CLI (`sanity dev` / `sanity deploy`),
// not embedded in the Next.js app — see README, "Sanity Studio" section, for
// why (a Cloudflare Workers runtime incompatibility with the embedded
// next-sanity Studio route).
export default defineConfig({
  name: "devino",
  title: "deVino",
  projectId,
  dataset,
  schema,
  plugins: [
    structureTool({ structure }),
    // Vision lets editors run GROQ queries from within the Studio — dev aid only.
    ...(process.env.NODE_ENV === "development"
      ? [visionTool({ defaultApiVersion: apiVersion })]
      : []),
  ],
});
