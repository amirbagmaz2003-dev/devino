import { getSiteSettingsAdmin } from "@/db/admin";
import { getTelegramChatId } from "@/db/bookings";
import { isTelegramBotConfigured } from "@/lib/telegram";
import AdminForm, { SubmitButton } from "@/components/admin/AdminForm";
import {
  connectTelegramAction,
  sendTelegramTestAction,
  updateSiteSettingsAction,
} from "./actions";

export default async function AdminSettingsPage() {
  const [settings, chatId, botConfigured] = await Promise.all([
    getSiteSettingsAdmin(),
    getTelegramChatId(),
    isTelegramBotConfigured(),
  ]);
  const connected = Boolean(chatId && botConfigured);

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

      <section
        aria-labelledby="telegram-heading"
        className="mt-10 max-w-xl rounded-lg border border-zinc-200 bg-white p-5"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="telegram-heading" className="text-base font-semibold">
            اتصال تلگرام
          </h2>
          <span
            data-testid="telegram-status"
            className={`rounded-full px-3 py-1 text-xs ${
              connected ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {connected ? "متصل است" : "متصل نیست"}
          </span>
        </div>
        <p className="mt-3 text-sm text-zinc-600">
          ابتدا در تلگرام به ربات خود پیام /start بدهید، سپس دکمه‌ی زیر را بزنید.
        </p>
        <div className="mt-4 flex flex-wrap items-start gap-3">
          <AdminForm action={connectTelegramAction} className="space-y-2">
            <SubmitButton>اتصال</SubmitButton>
          </AdminForm>
          <AdminForm action={sendTelegramTestAction} className="space-y-2">
            <SubmitButton className="rounded-md border border-zinc-300 bg-white px-5 py-2 text-sm font-medium hover:bg-zinc-50">
              ارسال پیام آزمایشی
            </SubmitButton>
          </AdminForm>
        </div>
      </section>
    </div>
  );
}
