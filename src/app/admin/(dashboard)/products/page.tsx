import Link from "next/link";
import { listProductsAdmin } from "@/db/admin";
import { deleteProductAction } from "./actions";

export default async function AdminProductsPage() {
  const products = await listProductsAdmin();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">محصولات</h1>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + محصول جدید
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">هنوز محصولی ثبت نشده است.</p>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {products.map((product) => (
            <li key={product.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{product.name_fa}</p>
                <p className="text-xs text-zinc-500">
                  {product.name_en} · /{product.slug} · {product.price.toLocaleString("fa-IR")}{" "}
                  تومان {product.in_stock === 0 && "· ناموجود"}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <Link
                  href={`/admin/products/${product.id}/edit`}
                  className="text-zinc-600 hover:text-zinc-900"
                >
                  ویرایش
                </Link>
                <form action={deleteProductAction.bind(null, product.id)}>
                  <button type="submit" className="text-red-600 hover:text-red-800">
                    حذف
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
