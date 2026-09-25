"use client";

import { useState } from "react";
import { makeVariants } from "@/lib/imageResize";
import { toPersianDigits } from "@/lib/jalali";
import { VARIANT_WIDTHS } from "@/lib/mediaVariants";
import { listImagesMissingVariantsAction, uploadVariantsAction } from "./actions";

type Status =
  | { phase: "idle" }
  | { phase: "running"; done: number; total: number }
  | { phase: "finished"; created: number; failed: number };

/**
 * «ساخت نسخه‌های کوچک برای عکس‌های قبلی»: images uploaded before brief 03
 * have no 800/1600px variants. Their variants are made here, in the
 * browser (same resize code as new uploads), one image at a time, and
 * uploaded next to the original.
 */
export default function BackfillVariants() {
  const [status, setStatus] = useState<Status>({ phase: "idle" });
  const fa = (n: number) => toPersianDigits(n);

  async function run() {
    const ids = await listImagesMissingVariantsAction();
    let created = 0;
    let failed = 0;
    setStatus({ phase: "running", done: 0, total: ids.length });
    for (const [index, id] of ids.entries()) {
      try {
        const response = await fetch(`/media/${id}`);
        const variants = response.ok ? await makeVariants(await response.blob()) : null;
        if (!variants) throw new Error("decode failed");
        const formData = new FormData();
        for (const width of VARIANT_WIDTHS) formData.set(`w${width}`, variants[width]);
        if (await uploadVariantsAction(id, formData)) created++;
        else failed++;
      } catch {
        failed++;
      }
      setStatus({ phase: "running", done: index + 1, total: ids.length });
    }
    setStatus({ phase: "finished", created, failed });
  }

  const running = status.phase === "running";
  return (
    <div>
      <button
        type="button"
        onClick={() => void run()}
        disabled={running}
        className="rounded-md border border-zinc-300 bg-white px-5 py-2 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        ساخت نسخه‌های کوچک برای عکس‌های قبلی
      </button>
      <p role="status" aria-live="polite" className="mt-2 text-sm text-zinc-600">
        {status.phase === "running" &&
          `در حال ساخت… ${fa(status.done)} از ${fa(status.total)}`}
        {status.phase === "finished" &&
          (status.created === 0 && status.failed === 0
            ? "همه‌ی عکس‌ها از قبل نسخه‌ی کوچک دارند."
            : `نسخه‌های کوچک برای ${fa(status.created)} عکس ساخته شد.` +
              (status.failed > 0 ? ` (${fa(status.failed)} عکس ناموفق)` : ""))}
      </p>
    </div>
  );
}
