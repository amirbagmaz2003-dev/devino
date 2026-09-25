/** Shared by the order server action and its client form (no server imports). */
import type { ContactMethod } from "@/lib/orderOptions";

export type OrderFieldError = "name" | "phone" | "product" | "size" | "telegramUsername";

export type OrderFormState =
  | { status: "idle" }
  | { status: "success"; method: ContactMethod }
  | { status: "error"; fieldErrors?: OrderFieldError[]; generic?: boolean };
