"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import {
  MESSAGES,
  parseAdminInteger,
  type AdminFormState,
} from "@/lib/adminForm";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductAdmin,
  getProductMedia,
  addProductMedia,
  removeProductMedia,
  deleteMedia,
  deleteMediaIfUnreferenced,
  isSlugTaken,
  isUniqueSlugViolation,
  uploadMedia,
  slugify,
  type ProductInput,
} from "@/db/admin";
import { readUploadedFile } from "../upload";

const INVALID_STOCK = "موجودی را فقط به‌صورت عدد وارد کنید.";

type ParsedProductForm =
  | { input: ProductInput; state?: undefined }
  | { input?: undefined; state: AdminFormState };

function readProductForm(formData: FormData): ParsedProductForm {
  const nameFa = String(formData.get("nameFa") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const slug = rawSlug || slugify(nameEn || nameFa);
  if (!nameFa || !nameEn || !slug)
    return { state: { error: MESSAGES.saveFailed } };

  const price = parseAdminInteger(String(formData.get("price") ?? ""));
  const stockCountRaw = String(formData.get("stockCount") ?? "").trim();
  const stockCount = stockCountRaw ? parseAdminInteger(stockCountRaw) : null;
  const fieldErrors: NonNullable<AdminFormState>["fieldErrors"] = {};
  if (price === null) fieldErrors.price = MESSAGES.invalidPrice;
  if (stockCountRaw && stockCount === null)
    fieldErrors.stockCount = INVALID_STOCK;
  if (price === null || (stockCountRaw && stockCount === null))
    return { state: { fieldErrors } };

  return {
    input: {
      slug,
      nameFa,
      nameEn,
      descriptionFa: String(formData.get("descriptionFa") ?? ""),
      descriptionEn: String(formData.get("descriptionEn") ?? ""),
      price,
      inStock: formData.get("inStock") === "on",
      stockCount,
      collectionId: String(formData.get("collectionId") ?? "") || null,
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    },
  };
}

function readImageMeta(
  formData: FormData,
  fallbackAltFa = "",
  fallbackAltEn = "",
) {
  return {
    focalX: Number(formData.get("imageFocalX") ?? 0.5),
    focalY: Number(formData.get("imageFocalY") ?? 0.5),
    altFa: String(formData.get("imageAltFa") ?? "") || fallbackAltFa,
    altEn: String(formData.get("imageAltEn") ?? "") || fallbackAltEn,
  };
}

function revalidatePublicPages() {
  revalidatePath("/[locale]/products/[slug]", "page");
  revalidatePath("/[locale]/collections/[slug]", "page");
  revalidatePath("/[locale]/collections", "page");
}

export async function createProductAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = readProductForm(formData);
  if (!parsed.input) return parsed.state;
  const { input } = parsed;

  const upload = readUploadedFile(formData, "imageFile");
  if (upload.error) return { fieldErrors: { file: upload.error } };

  let id: string;
  try {
    if (await isSlugTaken("products", input.slug)) {
      return { fieldErrors: { slug: MESSAGES.duplicateSlug } };
    }
    // Upload only after validation passed; roll the file back if the
    // product insert (batched with the gallery link) still fails.
    const mediaId = upload.file
      ? await uploadMedia({
          type: "image",
          file: upload.file,
          variants: upload.variants,
          ...readImageMeta(formData, input.nameFa, input.nameEn),
        })
      : null;
    try {
      id = await createProduct(input, mediaId);
    } catch (error) {
      if (mediaId) await deleteMedia(mediaId);
      if (isUniqueSlugViolation(error)) {
        return { fieldErrors: { slug: MESSAGES.duplicateSlug } };
      }
      throw error;
    }
  } catch (error) {
    console.error("[admin] creating product failed", error);
    return { error: MESSAGES.saveFailed };
  }

  revalidatePublicPages();
  revalidatePath("/admin/products");
  redirect(`/admin/products/${id}/edit`);
}

export async function updateProductAction(
  id: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = readProductForm(formData);
  if (!parsed.input) return parsed.state;
  const { input } = parsed;

  try {
    if (!(await getProductAdmin(id))) return { error: MESSAGES.saveFailed };
    if (await isSlugTaken("products", input.slug, id)) {
      return { fieldErrors: { slug: MESSAGES.duplicateSlug } };
    }
    await updateProduct(id, input);
  } catch (error) {
    if (isUniqueSlugViolation(error))
      return { fieldErrors: { slug: MESSAGES.duplicateSlug } };
    console.error("[admin] updating product failed", error);
    return { error: MESSAGES.saveFailed };
  }

  revalidatePublicPages();
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function deleteProductAction(
  id: string,
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  void _formData;
  try {
    await deleteProduct(id);
  } catch (error) {
    console.error("[admin] deleting product failed", error);
    return { error: MESSAGES.saveFailed };
  }
  revalidatePath("/admin/products");
  revalidatePublicPages();
  return null;
}

export async function addProductImageAction(
  productId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const upload = readUploadedFile(formData, "imageFile");
  if (upload.error) return { fieldErrors: { file: upload.error } };
  // Used to return silently here, which looked like the button did nothing.
  if (!upload.file) return { fieldErrors: { file: "لطفاً یک عکس انتخاب کنید." } };

  try {
    if (!(await getProductAdmin(productId)))
      return { error: MESSAGES.saveFailed };
    const existing = await getProductMedia(productId);
    const mediaId = await uploadMedia({
      type: "image",
      file: upload.file,
      variants: upload.variants,
      ...readImageMeta(formData),
    });
    try {
      await addProductMedia(productId, mediaId, existing.length);
    } catch (error) {
      await deleteMedia(mediaId);
      throw error;
    }
  } catch (error) {
    console.error("[admin] adding product image failed", error);
    return { error: MESSAGES.saveFailed };
  }

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePublicPages();
  // A fresh (non-null, error-free) state tells the form it may clear itself.
  return {};
}

export async function removeProductImageAction(
  productId: string,
  mediaId: string,
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  void _formData;
  try {
    await removeProductMedia(productId, mediaId);
    await deleteMediaIfUnreferenced(mediaId);
  } catch (error) {
    console.error("[admin] removing product image failed", error);
    return { error: MESSAGES.saveFailed };
  }
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePublicPages();
  return null;
}
