#!/usr/bin/env node
/**
 * One-time seed script for a REAL Sanity project — not run automatically,
 * and never during build/deploy. No fake data is shipped in the app
 * itself (see src/sanity/lib/queries.ts, which just returns empty results
 * until real content exists); this script is the deliberate, explicit way
 * to populate that content, using the placeholder photos already in
 * public/photos/ so the site has something to show before real product
 * photography exists.
 *
 * Usage (once a real Sanity project is created and connected):
 *
 *   NEXT_PUBLIC_SANITY_PROJECT_ID=<id> \
 *   NEXT_PUBLIC_SANITY_DATASET=production \
 *   SANITY_API_WRITE_TOKEN=<token> \
 *   node scripts/seed.mjs
 *
 * The token needs Editor (or Admin) permissions — create one at
 * sanity.io/manage → your project → API → Tokens. Safe to re-run: it
 * always creates new documents (drafts you can review in Studio before
 * publishing), it never edits or deletes existing ones.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "next-sanity";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const photosDir = path.join(__dirname, "..", "public", "photos");

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId || projectId === "placeholder") {
  console.error(
    "Set NEXT_PUBLIC_SANITY_PROJECT_ID to a real Sanity project ID first (see README).",
  );
  process.exit(1);
}
if (!token) {
  console.error(
    "Set SANITY_API_WRITE_TOKEN to an Editor/Admin token from sanity.io/manage first.",
  );
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: "2024-01-01",
  useCdn: false,
});

const COLLECTIONS = [
  {
    slug: "nocturne",
    name: "Nocturne",
    description: "Deep, dramatic silhouettes for the night.",
    cover: "black-halter-rooftop.jpg",
    products: [
      {
        slug: "coast-slip-dress",
        name: "Coast Slip Dress",
        price: 12500000,
        images: ["black-slip-dress-coast.jpg"],
      },
      {
        slug: "halter-rooftop-gown",
        name: "Halter Rooftop Gown",
        price: 16800000,
        images: ["black-halter-rooftop.jpg"],
      },
    ],
  },
  {
    slug: "gilded-hour",
    name: "Gilded Hour",
    description: "Warm metallics for golden-hour occasions.",
    cover: "gold-satin-mirror.jpg",
    products: [
      {
        slug: "mirror-gown",
        name: "Mirror Gown",
        price: 18900000,
        images: ["gold-satin-mirror.jpg"],
        inStock: false,
      },
    ],
  },
  {
    slug: "olive-grove",
    name: "Olive Grove",
    description: "The brand's signature olive, in motion.",
    cover: "olive-satin-one-shoulder.jpg",
    products: [
      {
        slug: "one-shoulder-olive",
        name: "One-Shoulder Olive",
        price: 15200000,
        images: ["olive-satin-one-shoulder.jpg", "olive-slit-dress-mirror.jpg"],
      },
      {
        slug: "wrap-cropped-top",
        name: "Wrap Cropped Top",
        price: 8400000,
        images: ["cream-wrap-cropped.jpg"],
      },
    ],
  },
];

const assetCache = new Map();

async function uploadImage(filename) {
  if (assetCache.has(filename)) return assetCache.get(filename);
  const filePath = path.join(photosDir, filename);
  const asset = await client.assets.upload("image", fs.createReadStream(filePath), {
    filename,
  });
  assetCache.set(filename, asset);
  return asset;
}

function mediaBoxImage(asset, alt) {
  return {
    _type: "mediaBox",
    _key: randomUUID(),
    type: "image",
    image: { _type: "image", asset: { _type: "reference", _ref: asset._id } },
    alt,
  };
}

async function run() {
  for (const collection of COLLECTIONS) {
    console.log(`Seeding collection: ${collection.name}`);
    const coverAsset = await uploadImage(collection.cover);

    const productRefs = [];
    for (const product of collection.products) {
      const images = await Promise.all(
        product.images.map(async (file) =>
          mediaBoxImage(await uploadImage(file), product.name),
        ),
      );
      const doc = await client.create({
        _id: `drafts.product-${product.slug}`,
        _type: "product",
        name: product.name,
        slug: { _type: "slug", current: product.slug },
        price: product.price,
        inStock: product.inStock ?? true,
        images,
      });
      productRefs.push({ _type: "reference", _ref: doc._id, _key: randomUUID() });
      console.log(`  created product (draft): ${product.name}`);
    }

    const collectionDoc = await client.create({
      _id: `drafts.collection-${collection.slug}`,
      _type: "collection",
      name: collection.name,
      slug: { _type: "slug", current: collection.slug },
      description: collection.description,
      coverImage: mediaBoxImage(coverAsset, collection.name),
      products: productRefs,
    });
    console.log(`  created collection (draft): ${collection.name}`);

    await Promise.all(
      productRefs.map((ref) =>
        client
          .patch(ref._ref)
          .set({ collection: { _type: "reference", _ref: collectionDoc._id } })
          .commit(),
      ),
    );
  }

  console.log(
    "\nDone. All documents were created as drafts — review and publish them in Sanity Studio (npm run studio:dev).",
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
