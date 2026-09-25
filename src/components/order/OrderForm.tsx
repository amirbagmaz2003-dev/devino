"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { submitOrderAction } from "@/app/(site)/[locale]/order/actions";
import type { OrderFieldError, OrderFormState } from "@/app/(site)/[locale]/order/orderForm";
import MediaBox, { type MediaBoxProps } from "@/components/MediaBox";
import { formatPrice } from "@/lib/formatPrice";
import { CONTACT_METHODS, ORDER_SIZES, type ContactMethod } from "@/lib/orderOptions";
import { FIELD_CLASS } from "./fieldStyles";

export interface OrderProduct {
  slug: string;
  name: string;
  price: number;
  image: MediaBoxProps | null;
}

export interface OrderProductGroup {
  /** null = products without a collection. */
  label: string | null;
  products: OrderProduct[];
}

interface OrderFormProps {
  locale: "fa" | "en";
  productGroups: OrderProductGroup[];
  /** From ?product=<slug>, already checked against the product list. */
  initialProduct: string;
  currencyUnit: string;
  /** Heading + intro, rendered under the product summary. */
  header: ReactNode;
}

const FIELD_ORDER: OrderFieldError[] = [
  "name",
  "phone",
  "product",
  "size",
  "telegramUsername",
];

/**
 * The order request form. Submits from onSubmit (not `<form action>`) so
 * a failed submission keeps everything typed; the button is disabled
 * while pending so it can't be sent twice. Validation happens on the
 * server (noValidate), which keeps every message in the brief's exact
 * wording. On error, focus moves to the first invalid field; each
 * field's message is linked via aria-describedby and announced.
 */
export default function OrderForm({
  locale,
  productGroups,
  initialProduct,
  currencyUnit,
  header,
}: OrderFormProps) {
  const t = useTranslations("order");
  const [state, dispatch, pending] = useActionState<OrderFormState, FormData>(submitOrderAction, {
    status: "idle",
  });
  const [, startTransition] = useTransition();
  const [productSlug, setProductSlug] = useState(initialProduct);
  const [contactMethod, setContactMethod] = useState<ContactMethod>("phone");
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);

  const errors = new Set(state.status === "error" ? (state.fieldErrors ?? []) : []);
  const product = productGroups.flatMap((group) => group.products).find((p) => p.slug === productSlug);

  useEffect(() => {
    if (state.status === "success") {
      successRef.current?.focus();
      return;
    }
    if (state.status !== "error") return;
    const first = FIELD_ORDER.find((field) => state.fieldErrors?.includes(field));
    if (first) formRef.current?.querySelector<HTMLElement>(`#order-${first}`)?.focus();
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  const describe = (field: OrderFieldError, extra?: string) =>
    [errors.has(field) ? `order-${field}-error` : null, extra].filter(Boolean).join(" ") || undefined;
  const invalid = (field: OrderFieldError) => errors.has(field) || undefined;
  const error = (field: OrderFieldError) => (errors.has(field) ? t(`errors.${field}`) : null);

  return (
    <>
      {product && (
        <div data-testid="order-summary" className="border-matte-black/15 mb-10 flex items-center gap-5 border-b pb-6">
          <div className="bg-matte-black/5 relative aspect-[3/4] w-20 shrink-0 overflow-hidden">
            {product.image && <MediaBox {...product.image} zoom={false} sizes="80px" />}
          </div>
          <div>
            <p className="font-heading text-xl">{product.name}</p>
            <p className="text-matte-black/70 mt-1 text-sm">
              {formatPrice(product.price, locale, currencyUnit)}
            </p>
          </div>
        </div>
      )}

      {header}

      {state.status === "success" ? (
        <p
          ref={successRef}
          tabIndex={-1}
          role="status"
          className="border-olive-accent font-heading mt-12 border-s-2 py-6 ps-6 text-xl leading-relaxed focus:outline-none sm:text-2xl"
        >
          {t("success", { method: t(`successMethods.${state.method}`) })}
        </p>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-12 space-y-6">
          <input type="hidden" name="locale" value={locale} />

          {/* Honeypot — hidden from people and assistive tech; bots fill it. */}
          <div aria-hidden="true" className="absolute -start-[10000px] h-px w-px overflow-hidden">
            <label htmlFor="order-website">Website</label>
            <input id="order-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          {state.status === "error" && state.generic && (
            <p role="alert" className="border-matte-black border-s-2 ps-4 text-sm">
              {t("errors.generic")}
            </p>
          )}

          <Field id="order-name" label={t("fields.name")} error={error("name")}>
            <input
              id="order-name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={120}
              aria-invalid={invalid("name")}
              aria-describedby={describe("name")}
              className={FIELD_CLASS}
            />
          </Field>

          <Field id="order-phone" label={t("fields.phone")} error={error("phone")}>
            <input
              id="order-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder={locale === "fa" ? "۰۹۱۲ ۳۴۵ ۶۷۸۹" : "0912 345 6789"}
              aria-invalid={invalid("phone")}
              aria-describedby={describe("phone")}
              className={`${FIELD_CLASS} ${locale === "fa" ? "text-end" : ""}`}
            />
          </Field>

          <Field id="order-product" label={t("fields.product")} error={error("product")}>
            <select
              id="order-product"
              name="product"
              value={productSlug}
              onChange={(event) => setProductSlug(event.target.value)}
              aria-invalid={invalid("product")}
              aria-describedby={describe("product")}
              className={FIELD_CLASS}
            >
              <option value="">{t("fields.productPlaceholder")}</option>
              {productGroups.map((group) => (
                <optgroup key={group.label ?? "_"} label={group.label ?? t("fields.productUngrouped")}>
                  {group.products.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          <Field id="order-size" label={t("fields.size")} error={error("size")}>
            <select
              id="order-size"
              name="size"
              defaultValue=""
              aria-invalid={invalid("size")}
              aria-describedby={describe("size", "order-size-hint")}
              className={FIELD_CLASS}
            >
              <option value="">{t("fields.sizePlaceholder")}</option>
              {ORDER_SIZES.map((size) => (
                <option key={size} value={size}>
                  {locale === "fa" ? size.toLocaleString("fa-IR") : size}
                </option>
              ))}
            </select>
            <p id="order-size-hint" className="text-matte-black/60 mt-2 text-sm">
              {t("fields.sizeHint")}
            </p>
          </Field>

          <fieldset>
            <legend className="mb-3 block text-sm">{t("fields.contactMethod")}</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {CONTACT_METHODS.map((method) => (
                <label key={method} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="contactMethod"
                    value={method}
                    checked={contactMethod === method}
                    onChange={() => setContactMethod(method)}
                    className="accent-matte-black h-4 w-4"
                  />
                  {t(`contactMethods.${method}`)}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Only for Telegram — not rendered (so not submitted) otherwise. */}
          {contactMethod === "telegram" && (
            <Field id="order-telegramUsername" label={t("fields.telegramUsername")} error={error("telegramUsername")}>
              <input
                id="order-telegramUsername"
                name="telegramUsername"
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                dir="ltr"
                placeholder="@username"
                maxLength={33}
                required
                aria-invalid={invalid("telegramUsername")}
                aria-describedby={describe("telegramUsername")}
                className={`${FIELD_CLASS} ${locale === "fa" ? "text-end" : ""}`}
              />
            </Field>
          )}

          <Field id="order-note" label={t("fields.note")}>
            <textarea id="order-note" name="note" rows={4} maxLength={1000} className={`${FIELD_CLASS} resize-y`} />
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
      )}
    </>
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
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 flex items-center gap-2 text-sm">
          <span aria-hidden className="bg-olive-accent inline-block h-1.5 w-1.5 shrink-0 rounded-full" />
          {error}
        </p>
      )}
    </div>
  );
}
