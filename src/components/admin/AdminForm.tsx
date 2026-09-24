"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import {
  MESSAGES,
  type AdminFieldName,
  type AdminFormState,
} from "@/lib/adminForm";

type AdminAction = (
  state: AdminFormState,
  formData: FormData,
) => Promise<AdminFormState>;

interface AdminFormContextValue {
  state: AdminFormState;
  pending: boolean;
  /** Something client-side (e.g. an image resize) must finish before submit. */
  busy: boolean;
  setBusy: (busy: boolean) => void;
}

const AdminFormContext = createContext<AdminFormContextValue>({
  state: null,
  pending: false,
  busy: false,
  setBusy: () => {},
});

interface AdminFormProps {
  action: AdminAction;
  children: ReactNode;
  className?: string;
  /** Ask before submitting (window.confirm); cancel = nothing is sent. */
  confirmMessage?: string;
  /** Refuse to submit at all and show this instead (e.g. a collection that still has products). */
  blockedMessage?: string;
  /** Clear the form after a successful save that stays on the page (e.g. "add image"). */
  resetOnSuccess?: boolean;
}

/**
 * Wrapper for every admin form. Submits through useActionState but from
 * onSubmit (not `<form action>`), which gives us:
 * - no double submits: a second submit while one is pending is ignored,
 *   and SubmitButton is disabled meanwhile;
 * - no lost input on failure: React only auto-resets forms submitted via
 *   `<form action>`, so a failed save keeps everything typed (and the
 *   chosen file) and shows the error inside the form;
 * - optional confirmation / blocking before anything reaches the server.
 */
export default function AdminForm({
  action,
  children,
  className,
  confirmMessage,
  blockedMessage,
  resetOnSuccess = false,
}: AdminFormProps) {
  const [state, dispatch, pending] = useActionState(action, null);
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!pending) inFlight.current = false;
  }, [pending]);

  useEffect(() => {
    if (resetOnSuccess && state && !state.error && !state.fieldErrors) {
      formRef.current?.reset();
    }
  }, [state, resetOnSuccess]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || pending || busy) return;
    if (blockedMessage) {
      setBlocked(true);
      return;
    }
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    const nativeEvent = event.nativeEvent as SubmitEvent;
    const formData = new FormData(event.currentTarget, nativeEvent.submitter);
    inFlight.current = true;
    startTransition(() => dispatch(formData));
  }

  const error = blocked ? blockedMessage : state?.error;

  return (
    <AdminFormContext.Provider value={{ state, pending, busy, setBusy }}>
      <form ref={formRef} onSubmit={handleSubmit} className={className}>
        {error && (
          <p
            role="alert"
            className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {children}
      </form>
    </AdminFormContext.Provider>
  );
}

export function useAdminForm() {
  return useContext(AdminFormContext);
}

/** Disabled while the form is pending or busy; label switches to «در حال ذخیره…». */
export function SubmitButton({
  children,
  className = "rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { pending, busy } = useAdminForm();
  // Also honour a plain `<form action>` parent, should one ever use this.
  const { pending: nativePending } = useFormStatus();
  const disabled = pending || busy || nativePending;
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-busy={pending || nativePending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending || nativePending ? MESSAGES.saving : children}
    </button>
  );
}

/** Inline error under a specific field, from the action's fieldErrors. */
export function FieldError({ name }: { name: AdminFieldName }) {
  const { state } = useAdminForm();
  const message = state?.fieldErrors?.[name];
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-red-700">
      {message}
    </p>
  );
}
