import type { BookingStatus } from "@/db/bookingStatus";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  new: "جدید",
  contacted: "تماس گرفته شد",
  done: "انجام شد",
  cancelled: "لغو شد",
};
