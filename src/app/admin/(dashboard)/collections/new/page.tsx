import CollectionForm from "../CollectionForm";
import { createCollectionAction } from "../actions";

export default function NewCollectionPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">کالکشن جدید</h1>
      <div className="mt-6">
        <CollectionForm action={createCollectionAction} />
      </div>
    </div>
  );
}
