import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">خوش آمدید</h1>
      <p className="mt-2 text-sm text-zinc-600">
        از این پنل می‌توانید کالکشن‌ها، محصولات و تنظیمات عمومی سایت را مدیریت کنید.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/collections"
          className="rounded-lg border border-zinc-200 bg-white p-5 hover:border-zinc-400"
        >
          <h2 className="font-medium">کالکشن‌ها</h2>
          <p className="mt-1 text-sm text-zinc-500">افزودن و ویرایش کالکشن‌ها</p>
        </Link>
        <Link
          href="/admin/products"
          className="rounded-lg border border-zinc-200 bg-white p-5 hover:border-zinc-400"
        >
          <h2 className="font-medium">محصولات</h2>
          <p className="mt-1 text-sm text-zinc-500">افزودن و ویرایش محصولات</p>
        </Link>
        <Link
          href="/admin/settings"
          className="rounded-lg border border-zinc-200 bg-white p-5 hover:border-zinc-400"
        >
          <h2 className="font-medium">تنظیمات سایت</h2>
          <p className="mt-1 text-sm text-zinc-500">شماره تماس، تلگرام، اینستاگرام</p>
        </Link>
      </div>
    </div>
  );
}
