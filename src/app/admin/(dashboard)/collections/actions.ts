"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCollection,
  updateCollection,
  deleteCollection,
  getCollectionAdmin,
  updateMediaFocalPoint,
  uploadMedia,
  slugify,
  type CollectionInput,
} from "@/db/admin";

function readCollectionForm(formData: FormData): CollectionInput {
  const nameFa = String(formData.get("nameFa") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  return {
    slug: rawSlug || slugify(nameEn || nameFa),
    nameFa,
    nameEn,
    descriptionFa: String(formData.get("descriptionFa") ?? ""),
    descriptionEn: String(formData.get("descriptionEn") ?? ""),
    coverMediaId: null, // filled in below
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  };
}

function revalidatePublicPages(slug: string) {
  revalidatePath("/[locale]/collections", "page");
  revalidatePath("/[locale]/collections/[slug]", "page");
  void slug;
}

export async function createCollectionAction(formData: FormData) {
  const input = readCollectionForm(formData);
  const file = formData.get("coverFile") as File | null;

  if (file && file.size > 0) {
    input.coverMediaId = await uploadMedia({
      type: "image",
      file,
      focalX: Number(formData.get("coverFocalX") ?? 0.5),
      focalY: Number(formData.get("coverFocalY") ?? 0.5),
      altFa: input.nameFa,
      altEn: input.nameEn,
    });
  }

  await createCollection(input);
  revalidatePublicPages(input.slug);
  redirect("/admin/collections");
}

export async function updateCollectionAction(id: string, formData: FormData) {
  const input = readCollectionForm(formData);
  const existing = await getCollectionAdmin(id);
  input.coverMediaId = existing?.cover_media_id ?? null;

  const file = formData.get("coverFile") as File | null;
  if (file && file.size > 0) {
    input.coverMediaId = await uploadMedia({
      type: "image",
      file,
      focalX: Number(formData.get("coverFocalX") ?? 0.5),
      focalY: Number(formData.get("coverFocalY") ?? 0.5),
      altFa: input.nameFa,
      altEn: input.nameEn,
    });
  } else if (existing?.cover_media_id) {
    await updateMediaFocalPoint(
      existing.cover_media_id,
      Number(formData.get("coverFocalX") ?? 0.5),
      Number(formData.get("coverFocalY") ?? 0.5),
    );
  }

  await updateCollection(id, input);
  revalidatePublicPages(input.slug);
  redirect("/admin/collections");
}

export async function deleteCollectionAction(id: string) {
  await deleteCollection(id);
  revalidatePath("/admin/collections");
  revalidatePublicPages("");
}
