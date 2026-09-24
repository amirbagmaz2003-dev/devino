import { notFound } from "next/navigation";
import Image from "next/image";
import {
  getProductAdmin,
  getProductMedia,
  listCollectionsAdmin,
} from "@/db/admin";
import { mediaUrl } from "@/db/media";
import FocalPointPicker from "@/components/admin/FocalPointPicker";
import AdminForm, { SubmitButton } from "@/components/admin/AdminForm";
import ProductForm from "../../ProductForm";
import {
  updateProductAction,
  addProductImageAction,
  removeProductImageAction,
} from "../../actions";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, images, collections] = await Promise.all([
    getProductAdmin(id),
    getProductMedia(id),
    listCollectionsAdmin(),
  ]);
  if (!product) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold">ویرایش محصول</h1>
      <div className="mt-6">
        <ProductForm
          action={updateProductAction.bind(null, id)}
          product={product}
          collections={collections}
        />
      </div>

      <div className="mt-10 max-w-xl border-t border-zinc-200 pt-6">
        <h2 className="text-lg font-semibold">گالری عکس‌ها</h2>

        {images.length > 0 && (
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((image) => (
              <li key={image.id} className="space-y-1">
                <div className="relative aspect-[3/4] overflow-hidden rounded border border-zinc-300">
                  <Image
                    src={mediaUrl(image.id)}
                    alt={image.alt_fa || image.alt_en}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <AdminForm
                  action={removeProductImageAction.bind(null, id, image.id)}
                >
                  <SubmitButton className="w-full text-xs text-red-600 hover:text-red-800">
                    حذف
                  </SubmitButton>
                </AdminForm>
              </li>
            ))}
          </ul>
        )}

        <AdminForm
          action={addProductImageAction.bind(null, id)}
          resetOnSuccess
          className="mt-6 space-y-3"
        >
          <FocalPointPicker
            namePrefix="imageFocal"
            fileInputName="imageFile"
            label="افزودن عکس جدید"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="imageAltFa"
              placeholder="متن جایگزین (فارسی)"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              name="imageAltEn"
              placeholder="متن جایگزین (انگلیسی)"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <SubmitButton className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50">
            افزودن عکس
          </SubmitButton>
        </AdminForm>
      </div>
    </div>
  );
}
