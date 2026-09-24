import { getSiteSettingsAdmin } from "@/db/admin";
import AdminForm, { SubmitButton } from "@/components/admin/AdminForm";
import { updateSiteSettingsAction } from "./actions";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettingsAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold">تنظیمات سایت</h1>
      <AdminForm
        action={updateSiteSettingsAction}
        resetOnSuccess
        className="mt-6 max-w-xl space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            نام برند
          </label>
          <input
            name="brandName"
            defaultValue={settings.brand_name}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              تگ‌لاین (فارسی)
            </label>
            <input
              name="taglineFa"
              defaultValue={settings.tagline_fa ?? ""}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              تگ‌لاین (انگلیسی)
            </label>
            <input
              name="taglineEn"
              defaultValue={settings.tagline_en ?? ""}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="border-t border-zinc-200 pt-5">
          <h2 className="text-sm font-semibold text-zinc-700">
            کانال‌های تماس
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            این‌ها در بخش «برای ثبت سفارش» صفحه‌ی هر محصول نمایش داده می‌شوند.
          </p>

          <div className="mt-3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                شماره تماس
              </label>
              <input
                name="contactPhone"
                defaultValue={settings.contact_phone ?? ""}
                placeholder="+98 912 000 0000"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                لینک تلگرام
              </label>
              <input
                name="telegramUrl"
                defaultValue={settings.telegram_url ?? ""}
                placeholder="https://t.me/..."
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                لینک اینستاگرام
              </label>
              <input
                name="instagramUrl"
                defaultValue={settings.instagram_url ?? ""}
                placeholder="https://instagram.com/..."
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <SubmitButton>ذخیره</SubmitButton>
      </AdminForm>
    </div>
  );
}
