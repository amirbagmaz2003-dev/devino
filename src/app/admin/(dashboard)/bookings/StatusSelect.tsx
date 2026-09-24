"use client";

import { useRef } from "react";
import AdminForm, { useAdminForm } from "@/components/admin/AdminForm";
import type { AdminFormState } from "@/lib/adminForm";
import { BOOKING_STATUSES, type BookingStatus } from "@/db/bookingStatus";
import { BOOKING_STATUS_LABELS } from "./labels";

type Action = (
  state: AdminFormState,
  formData: FormData,
) => Promise<AdminFormState>;

/** Saves as soon as a new status is picked — no separate save button. */
export default function StatusSelect({
  action,
  status,
  label,
}: {
  action: Action;
  status: BookingStatus;
  label: string;
}) {
  return (
    <AdminForm action={action} className="space-y-1">
      <Select status={status} label={label} />
    </AdminForm>
  );
}

function Select({ status, label }: { status: BookingStatus; label: string }) {
  const { pending } = useAdminForm();
  const ref = useRef<HTMLSelectElement>(null);
  return (
    <select
      ref={ref}
      name="status"
      aria-label={label}
      defaultValue={status}
      disabled={pending}
      onChange={() => ref.current?.form?.requestSubmit()}
      className="min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm disabled:opacity-60"
    >
      {BOOKING_STATUSES.map((value) => (
        <option key={value} value={value}>
          {BOOKING_STATUS_LABELS[value]}
        </option>
      ))}
    </select>
  );
}
