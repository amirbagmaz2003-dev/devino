import Link from "next/link";
import {
  BOOKING_STATUSES,
  isBookingStatus,
  listBookingsAdmin,
  type BookingAdminRow,
} from "@/db/bookings";
import { requireAdmin } from "@/lib/adminAuth";
import { formatJalali, toPersianDigits } from "@/lib/jalali";
import { updateBookingStatusAction } from "./actions";
import { BOOKING_STATUS_LABELS } from "./labels";
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

function BookingCard({ booking }: { booking: BookingAdminRow }) {
  return (
    <li className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto]">
      <div className="space-y-1 text-sm">
        <p className="text-base font-medium">{booking.name}</p>
        <p>
          <a
            href={`tel:${booking.phone}`}
            dir="ltr"
            className="text-zinc-900 underline underline-offset-4"
          >
            {booking.phone}
          </a>
        </p>
        <p className="text-zinc-600">
          لباس:{" "}
          {booking.product_slug ? (
            <a
              href={`/fa/products/${booking.product_slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-900 underline underline-offset-4"
            >
              {booking.product_name_fa}
            </a>
          ) : (
            "—"
          )}
        </p>
        <p className="text-zinc-600">
          تاریخ پیشنهادی:{" "}
          <span className="text-zinc-900">
            {formatJalali(booking.preferred_date)}
          </span>
        </p>
        {booking.note && (
          <p className="whitespace-pre-line text-zinc-700">{booking.note}</p>
        )}
        <p className="text-xs text-zinc-500">
          ثبت: {formatSubmitted(booking.created_at)}
        </p>
      </div>
      <div className="sm:pt-1">
        <StatusSelect
          action={updateBookingStatusAction.bind(null, booking.id)}
          status={booking.status}
          label={`وضعیت درخواست ${booking.name}`}
        />
      </div>
    </li>
  );
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status: rawStatus } = await searchParams;
  const status = isBookingStatus(rawStatus) ? rawStatus : null;
  const bookings = await listBookingsAdmin(status);

  const filters: { href: string; label: string; active: boolean }[] = [
    { href: "/admin/bookings", label: "همه", active: status === null },
    ...BOOKING_STATUSES.map((value) => ({
      href: `/admin/bookings?status=${value}`,
      label: BOOKING_STATUS_LABELS[value],
      active: status === value,
    })),
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">درخواست‌های پرو</h1>

      <nav
        aria-label="فیلتر وضعیت"
        className="mt-5 flex flex-wrap gap-2 text-sm"
      >
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

      {bookings.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">
          درخواستی با این وضعیت وجود ندارد.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </ul>
      )}
    </div>
  );
}
