# بریف — تغییر هاستینگ از Vercel به Cloudflare Workers

## دلیل تغییر

دسترسی به روش پرداخت برای Vercel در حال حاضر برای صاحب پروژه ممکن نیست. اکانت Cloudflare از قبل فعال است (یک پروژه‌ی دیگر با موفقیت روی آن دیپلوی شده) و بدون نیاز به پرداخت قابل استفاده است.

## کاری که باید انجام شود

پروژه‌ی Next.js موجود (فاز ۲ — برنچ `claude/phase-2-skeleton-m9zuaa`) را برای دیپلوی روی Cloudflare Workers آماده کن:

1. آداپتور رسمی Cloudflare برای Next.js را نصب و پیکربندی کن: `@opennextjs/cloudflare` (طبق مستندات: https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
2. فایل `wrangler.jsonc` (یا `wrangler.toml`) مناسب پروژه را بساز
3. اسکریپت‌های `preview` و `deploy` را طبق راهنمای OpenNext به `package.json` اضافه کن
4. مطمئن شو `npm run build` و دیپلوی آزمایشی (اگر امکانش هست از طریق Wrangler CLI) بدون خطا انجام می‌شود
5. تمام ارجاعات به Vercel در README یا کامنت‌های پروژه را به Cloudflare Workers به‌روزرسانی کن

## نکات مهم

- دامنه‌ی اصلی (`devinomaison.ir`) نباید به این Deployment متصل شود — فقط از آدرس پیش‌فرض `*.workers.dev` برای پیش‌نمایش استفاده شود، طبق `CLAUDE.md`.
- بقیه‌ی تصمیمات (Sanity، Tailwind، دوزبانه‌بودن با next-intl) بدون تغییر باقی می‌مانند — این تغییر فقط مربوط به لایه‌ی هاستینگ است.
- اگر آداپتور OpenNext با next-intl یا ساختار فعلی پروژه ناسازگاری خاصی نشان داد، آن را در پاسخ گزارش بده تا تصمیم بگیریم.

## خروجی مورد انتظار

یک لینک پیش‌نمایش با آدرس `*.workers.dev` که بتوان در مرورگر باز کرد و مسیرهای فارسی/انگلیسی سایت را روی آن دید.
