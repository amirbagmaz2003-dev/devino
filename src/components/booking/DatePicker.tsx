"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  GREGORIAN_MONTHS,
  JALALI_MONTHS,
  addDays,
  formatGregorian,
  formatJalali,
  gregorianMonthLength,
  gregorianToJalali,
  jalaliMonthLength,
  jalaliToGregorian,
  parseIsoDate,
  toIsoDate,
  toPersianDigits,
  weekday,
} from "@/lib/jalali";
import { FIELD_CLASS } from "./fieldStyles";

export type CalendarSystem = "jalali" | "gregorian";

interface DatePickerProps {
  id: string;
  name: string;
  calendar: CalendarSystem;
  /** Earliest selectable ISO date (today in Tehran). */
  min: string;
  value: string;
  onChange: (iso: string) => void;
  placeholder: string;
  labels: { previousMonth: string; nextMonth: string; close: string };
  invalid?: boolean;
  describedBy?: string;
  labelledBy: string;
}

interface MonthView {
  year: number;
  month: number;
}

// Persian weeks start on Saturday, English (Gregorian) on Sunday. Names
// are indexed by JS weekday (0 = Sunday … 6 = Saturday) in both.
const WEEK = {
  jalali: {
    start: 6,
    names: ["ی", "د", "س", "چ", "پ", "ج", "ش"],
    long: [
      "یکشنبه",
      "دوشنبه",
      "سه‌شنبه",
      "چهارشنبه",
      "پنجشنبه",
      "جمعه",
      "شنبه",
    ],
  },
  gregorian: {
    start: 0,
    names: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    long: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
  },
} as const;

function viewOf(iso: string, calendar: CalendarSystem): MonthView {
  const g = parseIsoDate(iso)!;
  if (calendar === "gregorian") return { year: g.year, month: g.month };
  const j = gregorianToJalali(g);
  return { year: j.year, month: j.month };
}

function monthLength(view: MonthView, calendar: CalendarSystem) {
  return calendar === "jalali"
    ? jalaliMonthLength(view.year, view.month)
    : gregorianMonthLength(view.year, view.month);
}

function dayIso(view: MonthView, day: number, calendar: CalendarSystem) {
  const ymd = { year: view.year, month: view.month, day };
  return toIsoDate(calendar === "jalali" ? jalaliToGregorian(ymd) : ymd);
}

function shiftMonth(view: MonthView, delta: number): MonthView {
  const index = view.year * 12 + (view.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function compareViews(a: MonthView, b: MonthView) {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/**
 * Accessible single-date picker. On /fa it is a Jalali (Persian) calendar
 * with Saturday-first weeks and Persian digits; on /en a Gregorian one.
 * Either way the submitted value (hidden input) is an ISO Gregorian date.
 * Days before `min` are disabled. Keyboard: arrows move by day/week
 * (mirrored under RTL), PageUp/PageDown by month, Home/End to week start/
 * end, Enter/Space selects, Escape closes.
 */
export default function DatePicker({
  id,
  name,
  calendar,
  min,
  value,
  onChange,
  placeholder,
  labels,
  invalid,
  describedBy,
  labelledBy,
}: DatePickerProps) {
  const rtl = calendar === "jalali";
  const week = WEEK[calendar];
  const format = calendar === "jalali" ? formatJalali : formatGregorian;
  const digits = (n: number) => (rtl ? toPersianDigits(n) : String(n));
  const monthNames = calendar === "jalali" ? JALALI_MONTHS : GREGORIAN_MONTHS;

  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(value || min);
  const [view, setView] = useState<MonthView>(() =>
    viewOf(value || min, calendar),
  );
  const minView = useMemo(() => viewOf(min, calendar), [min, calendar]);
  const dialogId = useId();
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  const moveFocus = useRef(false);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handlePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [open]);

  // Keep DOM focus on the roving "focused" day while navigating.
  useEffect(() => {
    if (!open || !moveFocus.current) return;
    moveFocus.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-iso="${focused}"]`)
      ?.focus();
  }, [open, focused, view]);

  function openPicker() {
    const start = value && value >= min ? value : min;
    setFocused(start);
    setView(viewOf(start, calendar));
    moveFocus.current = true;
    setOpen(true);
  }

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function focusDay(iso: string) {
    const target = iso < min ? min : iso;
    setFocused(target);
    setView(viewOf(target, calendar));
    moveFocus.current = true;
  }

  function select(iso: string) {
    if (iso < min) return;
    onChange(iso);
    close();
  }

  function handleGridKey(event: React.KeyboardEvent) {
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    const col = (weekday(focused) - week.start + 7) % 7;
    const moves: Record<string, () => string> = {
      [forward]: () => addDays(focused, 1),
      [back]: () => addDays(focused, -1),
      ArrowDown: () => addDays(focused, 7),
      ArrowUp: () => addDays(focused, -7),
      Home: () => addDays(focused, -col),
      End: () => addDays(focused, 6 - col),
      PageDown: () => {
        const next = shiftMonth(viewOf(focused, calendar), 1);
        const current = rtl
          ? gregorianToJalali(parseIsoDate(focused)!).day
          : parseIsoDate(focused)!.day;
        return dayIso(
          next,
          Math.min(current, monthLength(next, calendar)),
          calendar,
        );
      },
      PageUp: () => {
        const prev = shiftMonth(viewOf(focused, calendar), -1);
        const current = rtl
          ? gregorianToJalali(parseIsoDate(focused)!).day
          : parseIsoDate(focused)!.day;
        return dayIso(
          prev,
          Math.min(current, monthLength(prev, calendar)),
          calendar,
        );
      },
    };
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      focusDay(move());
    }
  }

  // Build the month grid: leading blanks, then day cells, in 7-column rows.
  const length = monthLength(view, calendar);
  const firstIso = dayIso(view, 1, calendar);
  const lead = (weekday(firstIso) - week.start + 7) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length }, (_, i) => dayIso(view, i + 1, calendar)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) =>
    cells.slice(r * 7, r * 7 + 7),
  );
  const canGoBack = compareViews(view, minView) > 0;
  const focusedInView = compareViews(viewOf(focused, calendar), view) === 0;

  const dayNumber = (iso: string) =>
    calendar === "jalali"
      ? gregorianToJalali(parseIsoDate(iso)!).day
      : parseIsoDate(iso)!.day;

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-labelledby={`${labelledBy} ${id}`}
        aria-describedby={describedBy}
        data-invalid={invalid || undefined}
        onClick={() => (open ? close() : openPicker())}
        className={`${FIELD_CLASS} flex items-center justify-between text-start ${value ? "" : "text-matte-black/45"}`}
      >
        <span>{value ? format(value) : placeholder}</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="text-matte-black/50 h-4 w-4 shrink-0"
        >
          <rect
            x="3"
            y="4.5"
            width="14"
            height="12"
            rx="1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M3 8h14M7 3v3M13 3v3"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
      </button>

      {open && (
        <div
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="bg-pearl-white border-matte-black/15 absolute inset-x-0 top-full z-30 mt-2 w-full max-w-sm border p-4 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.35)] sm:w-80"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => canGoBack && setView(shiftMonth(view, -1))}
              disabled={!canGoBack}
              aria-label={labels.previousMonth}
              className="hover:bg-matte-black/5 inline-flex h-11 w-11 items-center justify-center disabled:opacity-25"
            >
              <Chevron flip={!rtl} />
            </button>
            <p id={titleId} aria-live="polite" className="font-heading text-lg">
              {monthNames[view.month - 1]} {digits(view.year)}
            </p>
            <button
              type="button"
              onClick={() => setView(shiftMonth(view, 1))}
              aria-label={labels.nextMonth}
              className="hover:bg-matte-black/5 inline-flex h-11 w-11 items-center justify-center"
            >
              <Chevron flip={rtl} />
            </button>
          </div>

          <table
            ref={gridRef}
            role="grid"
            aria-labelledby={titleId}
            onKeyDown={handleGridKey}
            className="mt-2 w-full table-fixed border-collapse text-center text-sm"
          >
            <thead>
              <tr>
                {Array.from({ length: 7 }, (_, i) => (week.start + i) % 7).map(
                  (day) => (
                    <th
                      key={day}
                      scope="col"
                      abbr={week.long[day]}
                      className="text-matte-black/50 pb-1 text-xs font-normal"
                    >
                      {week.names[day]}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((iso, c) =>
                    iso === null ? (
                      <td key={c} />
                    ) : (
                      <td
                        key={iso}
                        role="gridcell"
                        aria-selected={iso === value}
                        className="p-0.5"
                      >
                        <button
                          type="button"
                          data-iso={iso}
                          tabIndex={
                            iso === focused ||
                            (!focusedInView && iso === firstIso)
                              ? 0
                              : -1
                          }
                          disabled={iso < min}
                          aria-current={iso === min ? "date" : undefined}
                          aria-label={format(iso)}
                          onClick={() => select(iso)}
                          onFocus={() => setFocused(iso)}
                          className={[
                            "inline-flex h-10 w-full items-center justify-center transition-colors",
                            "focus-visible:outline-olive-accent focus-visible:outline-2 focus-visible:-outline-offset-2",
                            iso === value
                              ? "bg-matte-black text-pearl-white"
                              : "hover:bg-matte-black/10 disabled:text-matte-black/20 disabled:hover:bg-transparent",
                            iso === min && iso !== value
                              ? "decoration-olive-accent underline underline-offset-4"
                              : "",
                          ].join(" ")}
                        >
                          {digits(dayNumber(iso))}
                        </button>
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => close()}
            className="text-matte-black/60 hover:text-matte-black mt-2 min-h-11 w-full text-xs tracking-wide"
          >
            {labels.close}
          </button>
        </div>
      )}
    </div>
  );
}

function Chevron({ flip }: { flip: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={`h-4 w-4 ${flip ? "rotate-180" : ""}`}
    >
      <path
        d="M6 3l5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}
