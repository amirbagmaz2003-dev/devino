"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import { MESSAGES, type AdminFormState } from "@/lib/adminForm";
import { isBookingStatus, updateBookingStatus } from "@/db/bookings";

export async function updateBookingStatusAction(
  id: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const status = formData.get("status");
  if (!isBookingStatus(status)) return { error: MESSAGES.saveFailed };
  try {
    if (!(await updateBookingStatus(id, status)))
      return { error: MESSAGES.saveFailed };
  } catch (error) {
    console.error("[admin] updating booking status failed", error);
    return { error: MESSAGES.saveFailed };
  }
  // The nav badge (count of new bookings) lives in the dashboard layout.
  revalidatePath("/admin", "layout");
  return null;
}
