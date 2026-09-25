import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { countNewOrders } from "@/db/orders";
import { logoutAction } from "../actions";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const newOrders = await countNewOrders().catch(() => 0);

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/admin" className="font-semibold">
            deVino Admin
          </Link>
          <Link href="/admin/collections" className="text-zinc-600 hover:text-zinc-900">
            کالکشن‌ها
          </Link>
          <Link href="/admin/products" className="text-zinc-600 hover:text-zinc-900">
            محصولات
          </Link>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900"
          >
            سفارش‌ها
            {newOrders > 0 && (
              <span
                data-testid="new-orders-badge"
                aria-label={`${newOrders} سفارش جدید`}
                className="min-w-5 rounded-full bg-zinc-900 px-1.5 text-center text-xs leading-5 text-white"
              >
                {newOrders.toLocaleString("fa-IR")}
              </span>
            )}
          </Link>
          <Link href="/admin/settings" className="text-zinc-600 hover:text-zinc-900">
            تنظیمات سایت
          </Link>
        </nav>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-900">
            خروج
          </button>
        </form>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
