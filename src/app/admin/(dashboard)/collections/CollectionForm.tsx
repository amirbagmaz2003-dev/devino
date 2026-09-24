import FocalPointPicker from "@/components/admin/FocalPointPicker";
import AdminForm, {
  FieldError,
  SubmitButton,
} from "@/components/admin/AdminForm";
import type { CollectionAdminRow } from "@/db/admin";
import type { AdminFormState } from "@/lib/adminForm";

interface CollectionFormProps {
  action: (
    state: AdminFormState,
    formData: FormData,
  ) => Promise<AdminFormState>;
  collection?: CollectionAdminRow | null;
  coverImageUrl?: string | null;
}

export default function CollectionForm({
  action,
  collection,
  coverImageUrl,
}: CollectionFormProps) {
  return (
    <AdminForm action={action} className="max-w-xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            نام (فارسی)
          </label>
          <input
            name="nameFa"
            defaultValue={collection?.name_fa}
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
            defaultValue={collection?.name_en}
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">Slug</label>
        <input
          name="slug"
          defaultValue={collection?.slug}
          placeholder="اگر خالی بماند، خودکار از نام انگلیسی ساخته می‌شود"
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <FieldError name="slug" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            توضیح (فارسی)
          </label>
          <textarea
            name="descriptionFa"
            defaultValue={collection?.description_fa ?? ""}
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
            defaultValue={collection?.description_en ?? ""}
            rows={3}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <FocalPointPicker
        namePrefix="coverFocal"
        fileInputName="coverFile"
        label="تصویر کاور"
        defaultFocalX={collection?.cover_media_id ? undefined : 0.5}
        existingImageUrl={coverImageUrl}
      />

      <div>
        <label className="block text-sm font-medium text-zinc-700">
          ترتیب نمایش
        </label>
        <input
          type="number"
          name="sortOrder"
          defaultValue={collection?.sort_order ?? 0}
          className="mt-1 w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <SubmitButton>ذخیره</SubmitButton>
    </AdminForm>
  );
}
