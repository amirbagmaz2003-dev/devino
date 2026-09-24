import FocalPointPicker from "@/components/admin/FocalPointPicker";
import AdminForm, {
  FieldError,
  SubmitButton,
} from "@/components/admin/AdminForm";
import IntegerInput from "@/components/admin/IntegerInput";
import type { ProductAdminRow, CollectionAdminRow } from "@/db/admin";
import type { AdminFormState } from "@/lib/adminForm";

interface ProductFormProps {
  action: (
    state: AdminFormState,
    formData: FormData,
  ) => Promise<AdminFormState>;
  product?: ProductAdminRow | null;
  collections: CollectionAdminRow[];
  /** Only the "new product" form uploads its first image inline — the
   * edit form manages the gallery separately (see EditProductPage). */
  showInitialImagePicker?: boolean;
}

export default function ProductForm({
  action,
  product,
  collections,
  showInitialImagePicker = false,
}: ProductFormProps) {
  return (
    <AdminForm action={action} className="max-w-xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            نام (فارسی)
          </label>
          <input
            name="nameFa"
            defaultValue={product?.name_fa}
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            نام (انگلیسی)
          </label>
          <input
            name="nameEn"
            defaultValue={product?.name_en}
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">Slug</label>
        <input
          name="slug"
          defaultValue={product?.slug}
          placeholder="اگر خالی بماند، خودکار از نام انگلیسی ساخته می‌شود"
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <FieldError name="slug" />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">
          کالکشن
        </label>
        <select
          name="collectionId"
          defaultValue={product?.collection_id ?? ""}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">— بدون کالکشن —</option>
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name_fa}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            توضیح (فارسی)
          </label>
          <textarea
            name="descriptionFa"
            defaultValue={product?.description_fa ?? ""}
            rows={3}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            توضیح (انگلیسی)
          </label>
          <textarea
            name="descriptionEn"
            defaultValue={product?.description_en ?? ""}
            rows={3}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="price"
            className="block text-sm font-medium text-zinc-700"
          >
            قیمت (تومان)
          </label>
          <IntegerInput
            id="price"
            name="price"
            defaultValue={product?.price ?? null}
            required
          />
          <FieldError name="price" />
        </div>
        <div>
          <label
            htmlFor="stockCount"
            className="block text-sm font-medium text-zinc-700"
          >
            موجودی دقیق (اختیاری)
          </label>
          <IntegerInput
            id="stockCount"
            name="stockCount"
            defaultValue={product?.stock_count}
          />
          <FieldError name="stockCount" />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="inStock"
              defaultChecked={product ? product.in_stock === 1 : true}
              className="h-4 w-4 rounded border-zinc-300"
            />
            موجود است
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">
          ترتیب نمایش
        </label>
        <input
          type="number"
          name="sortOrder"
          defaultValue={product?.sort_order ?? 0}
          className="mt-1 w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      {showInitialImagePicker && (
        <div className="border-t border-zinc-200 pt-5">
          <FocalPointPicker
            namePrefix="imageFocal"
            fileInputName="imageFile"
            label="تصویر اصلی (می‌توانید بعداً عکس‌های بیشتری اضافه کنید)"
          />
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                متن جایگزین (فارسی)
              </label>
              <input
                name="imageAltFa"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                متن جایگزین (انگلیسی)
              </label>
              <input
                name="imageAltEn"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <SubmitButton>ذخیره</SubmitButton>
    </AdminForm>
  );
}
