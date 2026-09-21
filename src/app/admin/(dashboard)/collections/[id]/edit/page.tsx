import { notFound } from "next/navigation";
import { getCollectionAdmin } from "@/db/admin";
import { mediaUrl } from "@/db/media";
import CollectionForm from "../../CollectionForm";
import { updateCollectionAction } from "../../actions";

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await getCollectionAdmin(id);
  if (!collection) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold">ویرایش کالکشن</h1>
      <div className="mt-6">
        <CollectionForm
          action={updateCollectionAction.bind(null, id)}
          collection={collection}
          coverImageUrl={collection.cover_media_id ? mediaUrl(collection.cover_media_id) : null}
        />
      </div>
    </div>
  );
}
