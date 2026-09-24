"use client";

import AdminForm, { SubmitButton } from "@/components/admin/AdminForm";
import { loginAction } from "../actions";

export default function LoginForm() {
  return (
    <AdminForm
      action={loginAction}
      className="w-full max-w-sm space-y-3 rounded-lg border border-zinc-200 bg-white p-8 shadow-sm"
    >
      <h1 className="text-lg font-semibold">ورود به پنل مدیریت deVino</h1>
      <label
        htmlFor="password"
        className="mt-6 block text-sm font-medium text-zinc-700"
      >
        رمز عبور
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoFocus
        className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
      />
      <SubmitButton className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
        ورود
      </SubmitButton>
    </AdminForm>
  );
}
