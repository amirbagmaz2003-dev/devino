"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductMedia,
  addProductMedia,
  removeProductMedia,
  deleteMedia,
  uploadMedia,
  slugify,
  type ProductInput,
} from "@/db/admin";

function readProductForm(formData: FormData): ProductInput {
  const nameFa = String(formData.get("nameFa") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const stockCountRaw = String(formData.get("stockCount") ?? "").trim();

  return {
    slug: rawSlug || slugify(nameEn || nameFa),
    nameFa,
    nameEn,
    descriptionFa: String(formData.get("descriptionFa") ?? ""),
    descriptionEn: String(formData.get("descriptionEn") ?? ""),
    price: Number(formData.get("price") ?? 0) || 0,
    inStock: formData.get("inStock") === "on",
    stockCount: stockCountRaw ? Number(stockCountRaw) : null,
    collectionId: String(formData.get("collectionId") ?? "") || null,
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  };
}

function revalidatePublicPages() {
  revalidatePath("/[locale]/products/[slug]", "page");
  revalidatePath("/[locale]/collections/[slug]", "page");
  revalidatePath("/[locale]/collections", "page");
}

export async function createProductAction(formData: FormData) {
  const input = readProductForm(formData);
  const id = await createProduct(input);

  const file = formData.get("imageFile") as File | null;
  if (file && file.size > 0) {
    const mediaId = await uploadMedia({
      type: "image",
      file,
      focalX: Number(formData.get("imageFocalX") ?? 0.5),
      focalY: Number(formData.get("imageFocalY") ?? 0.5),
      altFa: String(formData.get("imageAltFa") ?? "") || input.nameFa,
      altEn: String(formData.get("imageAltEn") ?? "") || input.nameEn,
    });
    await addProductMedia(id, mediaId, 0);
  }

  revalidatePublicPages();
  redirect(`/admin/products/${id}/edit`);
}

export async function updateProductAction(id: string, formData: FormData) {
  const input = readProductForm(formData);
  await updateProduct(id, input);
  revalidatePublicPages();
  redirect("/admin/products");
}

export async function deleteProductAction(id: string) {
  await deleteProduct(id);
  revalidatePath("/admin/products");
  revalidatePublicPages();
}

export async function addProductImageAction(productId: string, formData: FormData) {
  const file = formData.get("imageFile") as File | null;
  if (file && file.size > 0) {
    const existing = await getProductMedia(productId);
    const mediaId = await uploadMedia({
      type: "image",
      file,
      focalX: Number(formData.get("imageFocalX") ?? 0.5),
      focalY: Number(formData.get("imageFocalY") ?? 0.5),
      altFa: String(formData.get("imageAltFa") ?? ""),
      altEn: String(formData.get("imageAltEn") ?? ""),
    });
    await addProductMedia(productId, mediaId, existing.length);
  }
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePublicPages();
}

export async function removeProductImageAction(productId: string, mediaId: string) {
  await removeProductMedia(productId, mediaId);
  await deleteMedia(mediaId);
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePublicPages();
}
