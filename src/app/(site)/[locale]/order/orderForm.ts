/** Shared by the order server action and its client form (no server imports). */

export type OrderFieldError =
  | "name"
  | "phone"
  | "product"
  | "size"
  | "province"
  | "city"
  | "address"
  | "postalCode";

export type OrderFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; fieldErrors?: OrderFieldError[]; generic?: boolean };
