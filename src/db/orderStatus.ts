/** Order statuses — import-free so client components can use them too. */
export const ORDER_STATUSES = ["new", "contacted", "confirmed", "shipped", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}
