import type { OrderStatus } from "@/db/orderStatus";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "جدید",
  contacted: "تماس گرفته شد",
  confirmed: "تأیید شد",
  shipped: "ارسال شد",
  cancelled: "لغو شد",
};
