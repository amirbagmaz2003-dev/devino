/** Shared by the booking server action and its client form (no server imports). */

export type BookingFieldError = "name" | "phone" | "date";

export type BookingFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; fieldErrors?: BookingFieldError[]; generic?: boolean };
