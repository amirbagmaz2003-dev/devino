import { loginAction } from "../actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <form
        action={loginAction}
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-lg font-semibold">ورود به پنل مدیریت deVino</h1>
        {error && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            رمز عبور اشتباه است.
          </p>
        )}
        <label htmlFor="password" className="mt-6 block text-sm font-medium text-zinc-700">
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
        <button
          type="submit"
          className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          ورود
        </button>
      </form>
    </div>
  );
}
