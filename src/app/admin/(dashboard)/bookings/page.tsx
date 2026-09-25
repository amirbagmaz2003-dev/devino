import { redirect } from "next/navigation";

/** The old bookings page became /admin/orders (brief 04). */
export default function BookingsRedirect() {
  redirect("/admin/orders");
}
