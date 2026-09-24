"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useTranslations } from "next-intl";
import { submitBookingAction } from "@/app/(site)/[locale]/contact/actions";
import type {
  BookingFieldError,
  BookingFormState,
} from "@/app/(site)/[locale]/contact/bookingForm";
import { todayInTehran } from "@/lib/jalali";
import DatePicker from "./DatePicker";
import { FIELD_CLASS } from "./fieldStyles";

export interface BookingProductGroup {
  /** null = products without a collection. */
  label: string | null;
  products: { slug: string; name: string }[];
}

interface BookingFormProps {
  locale: "fa" | "en";
  productGroups: BookingProductGroup[];
  /** From ?product=<slug>, already checked against the product list. */
  initialProduct: string;
  /** Tehran's "today" as seen by the server, so SSR and hydration agree. */
  today: string;
}

const FIELD_ORDER: BookingFieldError[] = ["name", "phone", "date"];

/**
 * The private-fitting booking form. Submits from onSubmit (not `<form
 * action>`) so a failed submission keeps everything typed; the button is
 * disabled while pending so it can't be sent twice. Validation happens on
 * the server (noValidate), which keeps every message in the brief's exact
 * wording rather than the browser's own. On error, focus moves to the
 * first invalid field; each field's message is linked via
 * aria-describedby and announced (role="alert").
 */
export default function BookingForm({
  locale,
  productGroups,
  initialProduct,
  today: serverToday,
}: BookingFormProps) {
  const t = useTranslations("contact");
  const [state, dispatch, pending] = useActionState<BookingFormState, FormData>(
    submitBookingAction,
    { status: "idle" },
  );
  const [, startTransition] = useTransition();
  const [date, setDate] = useState("");
  const [today, setToday] = useState(serverToday);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);

  // If the page stays open past midnight (Tehran), move the minimum along.
  useEffect(() => {
    const id = window.setInterval(() => setToday(todayInTehran()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const errors = new Set(
    state.status === "error" ? (state.fieldErrors ?? []) : [],
  );

  useEffect(() => {
    if (state.status === "success") {
      successRef.current?.focus();
      return;
    }
    if (state.status !== "error") return;
    const first = FIELD_ORDER.find((field) =>
      state.fieldErrors?.includes(field),
    );
    if (first)
      formRef.current?.querySelector<HTMLElement>(`#booking-${first}`)?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <p
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="border-olive-accent font-heading border-s-2 py-6 ps-6 text-xl leading-relaxed focus:outline-none sm:text-2xl"
      >
        {t("success")}
      </p>
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  const describe = (field: BookingFieldError) =>
    errors.has(field) ? `booking-${field}-error` : undefined;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6"
    >
      <input type="hidden" name="locale" value={locale} />

      {/* Honeypot — hidden from people and assistive tech; bots fill it. */}
      <div
        aria-hidden="true"
        className="absolute -start-[10000px] h-px w-px overflow-hidden"
      >
        <label htmlFor="booking-website">Website</label>
        <input
          id="booking-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state.status === "error" && state.generic && (
        <p role="alert" className="border-matte-black border-s-2 ps-4 text-sm">
          {t("errors.generic")}
        </p>
      )}

      <Field
        id="booking-name"
        label={t("fields.name")}
        error={errors.has("name") ? t("errors.name") : null}
      >
        <input
          id="booking-name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={120}
          aria-invalid={errors.has("name") || undefined}
          aria-describedby={describe("name")}
          className={FIELD_CLASS}
        />
      </Field>

      <Field
        id="booking-phone"
        label={t("fields.phone")}
        error={errors.has("phone") ? t("errors.phone") : null}
      >
        <input
          id="booking-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          placeholder={locale === "fa" ? "۰۹۱۲ ۳۴۵ ۶۷۸۹" : "0912 345 6789"}
          aria-invalid={errors.has("phone") || undefined}
          aria-describedby={describe("phone")}
          className={`${FIELD_CLASS} ${locale === "fa" ? "text-end" : ""}`}
        />
      </Field>

      <Field id="booking-product" label={t("fields.product")}>
        <select
          id="booking-product"
          name="product"
          defaultValue={initialProduct}
          className={FIELD_CLASS}
        >
          <option value="">{t("fields.productNone")}</option>
          {productGroups.map((group) => (
            <optgroup
              key={group.label ?? "_"}
              label={group.label ?? t("fields.productUngrouped")}
            >
              {group.products.map((product) => (
                <option key={product.slug} value={product.slug}>
                  {product.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      <div>
        <span id="booking-date-label" className="mb-2 block text-sm">
          {t("fields.date")}
        </span>
        <DatePicker
          id="booking-date"
          name="preferredDate"
          calendar={locale === "fa" ? "jalali" : "gregorian"}
          min={today}
          value={date}
          onChange={setDate}
          placeholder={t("fields.datePlaceholder")}
          labels={{
            previousMonth: t("calendar.previousMonth"),
            nextMonth: t("calendar.nextMonth"),
            close: t("calendar.close"),
          }}
          labelledBy="booking-date-label"
          invalid={errors.has("date")}
          describedBy={describe("date")}
        />
        {errors.has("date") && (
          <FieldErrorText id="booking-date-error">
            {t("errors.date")}
          </FieldErrorText>
        )}
      </div>

      <Field id="booking-note" label={t("fields.note")}>
        <textarea
          id="booking-note"
          name="note"
          rows={4}
          maxLength={1000}
          className={`${FIELD_CLASS} resize-y`}
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="bg-matte-black text-pearl-white hover:bg-matte-black/85 focus-visible:outline-olive-accent inline-flex min-h-12 w-full items-center justify-center px-10 text-sm tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {t("submit")}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  error = null,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm">
        {label}
      </label>
      {children}
      {error && <FieldErrorText id={`${id}-error`}>{error}</FieldErrorText>}
    </div>
  );
}

function FieldErrorText({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <p id={id} role="alert" className="mt-2 flex items-center gap-2 text-sm">
      <span
        aria-hidden
        className="bg-olive-accent inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      />
      {children}
    </p>
  );
}
