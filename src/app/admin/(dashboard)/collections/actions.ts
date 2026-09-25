"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import { MESSAGES, type AdminFormState } from "@/lib/adminForm";
import {
  createCollection,
  updateCollection,
  deleteCollection,
  getCollectionAdmin,
  countProductsInCollection,
  deleteMedia,
  deleteMediaIfUnreferenced,
  isSlugTaken,
  isUniqueSlugViolation,
  uploadMedia,
  slugify,
  type CollectionInput,
} from "@/db/admin";
import { readUploadedFile } from "../upload";

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

function revalidatePublicPages() {
  revalidatePath("/[locale]/collections", "page");
  revalidatePath("/[locale]/collections/[slug]", "page");
}

function readFocal(formData: FormData) {
  return {
    x: Number(formData.get("coverFocalX") ?? 0.5),
    y: Number(formData.get("coverFocalY") ?? 0.5),
  };
}

/**
 * Shared create/update flow. Order matters for orphan-free media: validate
 * everything first, upload the new cover only after that, and delete the
 * just-uploaded cover again if the DB write still fails. The old cover is
 * deleted only once the row points at the new one.
 */
async function saveCollection(
  id: string | null,
  formData: FormData,
): Promise<AdminFormState> {
  const input = readCollectionForm(formData);
  if (!input.nameFa || !input.nameEn || !input.slug) {
    return { error: MESSAGES.saveFailed };
  }

  const upload = readUploadedFile(formData, "coverFile");
  if (upload.error) return { fieldErrors: { file: upload.error } };

  try {
    const existing = id ? await getCollectionAdmin(id) : null;
    if (id && !existing) return { error: MESSAGES.saveFailed };

    if (await isSlugTaken("collections", input.slug, id)) {
      return { fieldErrors: { slug: MESSAGES.duplicateSlug } };
    }

    const focal = readFocal(formData);
    const oldCoverId = existing?.cover_media_id ?? null;
    let newCoverId: string | null = null;
    if (upload.file) {
      newCoverId = await uploadMedia({
        type: "image",
        file: upload.file,
        variants: upload.variants,
        focalX: focal.x,
        focalY: focal.y,
        altFa: input.nameFa,
        altEn: input.nameEn,
      });
    }
    input.coverMediaId = newCoverId ?? oldCoverId;

    try {
      if (id) {
        await updateCollection(
          id,
          input,
          !newCoverId && oldCoverId
            ? { mediaId: oldCoverId, ...focal }
            : undefined,
        );
      } else {
        await createCollection(input);
      }
    } catch (error) {
      if (newCoverId) await deleteMedia(newCoverId);
      if (isUniqueSlugViolation(error)) {
        return { fieldErrors: { slug: MESSAGES.duplicateSlug } };
      }
      throw error;
    }

    if (newCoverId && oldCoverId) {
      await deleteMediaIfUnreferenced(oldCoverId);
    }
  } catch (error) {
    console.error("[admin] saving collection failed", error);
    return { error: MESSAGES.saveFailed };
  }

  revalidatePublicPages();
  revalidatePath("/admin/collections");
  redirect("/admin/collections");
}

export async function createCollectionAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  return saveCollection(null, formData);
}

export async function updateCollectionAction(
  id: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  return saveCollection(id, formData);
}

export async function deleteCollectionAction(
  id: string,
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  void _formData;
  try {
    const existing = await getCollectionAdmin(id);
    if (!existing) return null;
    if (!(await deleteCollection(id))) {
      return (await countProductsInCollection(id)) > 0
        ? { error: MESSAGES.collectionHasProducts }
        : { error: MESSAGES.saveFailed };
    }
    if (existing.cover_media_id) {
      await deleteMediaIfUnreferenced(existing.cover_media_id);
    }
  } catch (error) {
    console.error("[admin] deleting collection failed", error);
    return { error: MESSAGES.saveFailed };
  }
  revalidatePath("/admin/collections");
  revalidatePublicPages();
  return null;
}
