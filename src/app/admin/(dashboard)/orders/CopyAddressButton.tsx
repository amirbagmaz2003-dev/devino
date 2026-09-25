"use client";

import { useState } from "react";

/** «کپی نشانی»: copies a courier-ready block (name, phone, province/city, address, postal code). */
export default function CopyAddressButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm hover:bg-zinc-50"
    >
      <span aria-live="polite">{copied ? "کپی شد" : "کپی نشانی"}</span>
    </button>
  );
}
