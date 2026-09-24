"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { formatAdminInteger } from "@/lib/adminForm";

interface IntegerInputProps {
  name: string;
  defaultValue?: number | null;
  required?: boolean;
  id?: string;
  className?: string;
}

/**
 * Replaces `<input type="number">` for price/stock. A number input changes
 * its value on mouse-wheel scroll, which is how 26,000,000 got saved as
 * 25,999,998 in production. This is a plain text input instead: numeric
 * keyboard on phones, Persian/Arabic digits normalized to 0–9 as you type,
 * thousands separators shown live (the server strips them again), and the
 * wheel does nothing.
 */
export default function IntegerInput({
  name,
  defaultValue,
  required,
  id,
  className = "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm",
}: IntegerInputProps) {
  const initial =
    defaultValue === null || defaultValue === undefined
      ? ""
      : String(defaultValue);
  const [value, setValue] = useState(() => formatAdminInteger(initial));
  const inputRef = useRef<HTMLInputElement>(null);
  // Digits to the left of the caret, so re-grouping doesn't make it jump.
  const pendingCaret = useRef<number | null>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const digitsBefore = pendingCaret.current;
    if (!input || digitsBefore === null || document.activeElement !== input)
      return;
    pendingCaret.current = null;
    let pos = 0;
    for (let seen = 0; pos < value.length && seen < digitsBefore; pos++) {
      if (/\d/.test(value[pos])) seen++;
    }
    input.setSelectionRange(pos, pos);
  }, [value]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    const caret = event.target.selectionStart ?? raw.length;
    pendingCaret.current = formatAdminInteger(raw.slice(0, caret)).replace(
      /\D/g,
      "",
    ).length;
    setValue(formatAdminInteger(raw));
  }

  return (
    <input
      ref={inputRef}
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      dir="ltr"
      required={required}
      value={value}
      onChange={handleChange}
      // Text inputs already ignore the wheel; blurring is belt-and-braces
      // against any browser/extension that maps wheel to arrow keys.
      onWheel={(event) => event.currentTarget.blur()}
      className={className}
    />
  );
}
