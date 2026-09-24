/** Booking statuses — import-free so client components can use them too. */
export const BOOKING_STATUSES = [
  "new",
  "contacted",
  "done",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export function isBookingStatus(value: unknown): value is BookingStatus {
  return (
    typeof value === "string" &&
    (BOOKING_STATUSES as readonly string[]).includes(value)
  );
}
