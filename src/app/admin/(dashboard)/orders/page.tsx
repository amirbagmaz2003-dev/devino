import Link from "next/link";
import { ORDER_STATUSES, isOrderStatus, listOrdersAdmin, type OrderAdminRow } from "@/db/orders";
import { requireAdmin } from "@/lib/adminAuth";
import { formatJalali, toPersianDigits } from "@/lib/jalali";
import { updateOrderStatusAction } from "./actions";
import CopyAddressButton from "./CopyAddressButton";
import { ORDER_STATUS_LABELS } from "./labels";
import StatusSelect from "./StatusSelect";

/** D1's datetime('now') is UTC "YYYY-MM-DD HH:MM:SS" -> Jalali date + Tehran time. */
function formatSubmitted(createdAt: string) {
  const date = new Date(`${createdAt.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return createdAt;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const iso = `${get("year")}-${get("month")}-${get("day")}`;
  return `${formatJalali(iso)}، ساعت ${toPersianDigits(`${get("hour")}:${get("minute")}`)}`;
}

/** The block «کپی نشانی» puts on the clipboard, laid out for a courier. */
function courierText(order: OrderAdminRow) {
  return [
    order.name,
    order.phone,
    `${order.province}، ${order.city}`,
    order.address,
    `کد پستی: ${order.postal_code}`,
  ].join("\n");
}

function OrderCard({ order }: { order: OrderAdminRow }) {
  return (
    <li className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto]">
      <div className="space-y-1 text-sm">
        <p className="text-base font-medium">{order.name}</p>
        <p>
          <a href={`tel:${order.phone}`} dir="ltr" className="text-zinc-900 underline underline-offset-4">
            {order.phone}
          </a>
        </p>
        <p className="text-zinc-600">
          لباس:{" "}
          {order.product_slug ? (
            <a
              href={`/fa/products/${order.product_slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-900 underline underline-offset-4"
            >
              {order.product_name_snapshot}
            </a>
          ) : (
            <span className="text-zinc-900">{order.product_name_snapshot}</span>
          )}
          {" · "}سایز: <span className="text-zinc-900">{toPersianDigits(order.size)}</span>
          {" · "}
          <span className="text-zinc-900">{order.price_snapshot.toLocaleString("fa-IR")} تومان</span>
        </p>
        <p className="text-zinc-600">
          استان/شهر:{" "}
          <span className="text-zinc-900">
            {order.province} / {order.city}
          </span>
        </p>
        <p className="text-zinc-600">
          نشانی: <span className="whitespace-pre-line text-zinc-900">{order.address}</span>
        </p>
        <p className="text-zinc-600">
          کد پستی:{" "}
          <span dir="ltr" className="text-zinc-900">
            {order.postal_code}
          </span>
        </p>
        {order.note && <p className="whitespace-pre-line text-zinc-700">{order.note}</p>}
        <p className="text-xs text-zinc-500">ثبت: {formatSubmitted(order.created_at)}</p>
      </div>
      <div className="flex flex-col items-start gap-2 sm:pt-1">
        <StatusSelect
          action={updateOrderStatusAction.bind(null, order.id)}
          status={order.status}
          label={`وضعیت سفارش ${order.name}`}
        />
        <CopyAddressButton text={courierText(order)} />
      </div>
    </li>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status: rawStatus } = await searchParams;
  const status = isOrderStatus(rawStatus) ? rawStatus : null;
  const orders = await listOrdersAdmin(status);

  const filters: { href: string; label: string; active: boolean }[] = [
    { href: "/admin/orders", label: "همه", active: status === null },
    ...ORDER_STATUSES.map((value) => ({
      href: `/admin/orders?status=${value}`,
      label: ORDER_STATUS_LABELS[value],
      active: status === value,
    })),
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">سفارش‌ها</h1>

      <nav aria-label="فیلتر وضعیت" className="mt-5 flex flex-wrap gap-2 text-sm">
        {filters.map((filter) => (
          <Link
            key={filter.href}
            href={filter.href}
            aria-current={filter.active ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 ${
              filter.active
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">سفارشی با این وضعیت وجود ندارد.</p>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}
