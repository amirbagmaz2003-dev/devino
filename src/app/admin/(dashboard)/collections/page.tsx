import Link from "next/link";
import { listCollectionsAdmin } from "@/db/admin";
import AdminForm, { SubmitButton } from "@/components/admin/AdminForm";
import { MESSAGES } from "@/lib/adminForm";
import { deleteCollectionAction } from "./actions";

export default async function AdminCollectionsPage() {
  const collections = await listCollectionsAdmin();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">کالکشن‌ها</h1>
        <Link
          href="/admin/collections/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + کالکشن جدید
        </Link>
      </div>

      {collections.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">هنوز کالکشنی ثبت نشده است.</p>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {collections.map((collection) => (
            <li
              key={collection.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="font-medium">{collection.name_fa}</p>
                <p className="text-xs text-zinc-500">
                  {collection.name_en} · /{collection.slug}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <Link
                  href={`/admin/collections/${collection.id}/edit`}
                  className="text-zinc-600 hover:text-zinc-900"
                >
                  ویرایش
                </Link>
                <AdminForm
                  action={deleteCollectionAction.bind(null, collection.id)}
                  confirmMessage={MESSAGES.confirmDeleteCollection}
                  blockedMessage={
                    collection.product_count > 0
                      ? MESSAGES.collectionHasProducts
                      : undefined
                  }
                  className="flex max-w-xs flex-col items-end gap-1"
                >
                  <SubmitButton className="text-red-600 hover:text-red-800">
                    حذف
                  </SubmitButton>
                </AdminForm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
