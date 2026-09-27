/**
 * Shared look for every order-form control (inputs, selects, textarea).
 * Focus = black border; invalid = error-red border doubled with an inset
 * ring (2px visually, no layout shift), and it stays red while focused,
 * so an invalid field never looks like a merely focused one.
 */
export const FIELD_CLASS =
  "border-matte-black/25 bg-pearl-white text-matte-black placeholder:text-matte-black/60 focus:border-matte-black focus-visible:outline-olive-accent aria-[invalid=true]:border-error-red aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-error-red aria-[invalid=true]:ring-inset aria-[invalid=true]:focus:border-error-red min-h-12 w-full border px-4 py-3 text-base transition-colors focus:outline-none focus-visible:outline-1 focus-visible:outline-offset-2 sm:text-sm";
