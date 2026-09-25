"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import { MESSAGES, type AdminFormState } from "@/lib/adminForm";
import { isOrderStatus, updateOrderStatus } from "@/db/orders";

export async function updateOrderStatusAction(
  id: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const status = formData.get("status");
  if (!isOrderStatus(status)) return { error: MESSAGES.saveFailed };
  try {
    if (!(await updateOrderStatus(id, status))) return { error: MESSAGES.saveFailed };
  } catch (error) {
    console.error("[admin] updating order status failed", error);
    return { error: MESSAGES.saveFailed };
  }
  // The nav badge (count of new orders) lives in the dashboard layout.
  revalidatePath("/admin", "layout");
  return null;
}
