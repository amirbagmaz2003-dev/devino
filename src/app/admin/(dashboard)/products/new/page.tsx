import { listCollectionsAdmin } from "@/db/admin";
import ProductForm from "../ProductForm";
import { createProductAction } from "../actions";

export default async function NewProductPage() {
  const collections = await listCollectionsAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold">محصول جدید</h1>
      <div className="mt-6">
        <ProductForm action={createProductAction} collections={collections} showInitialImagePicker />
      </div>
    </div>
  );
}
