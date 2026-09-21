"use client";

import { useRef, useState } from "react";

interface FocalPointPickerProps {
  /** Hidden inputs are submitted as `${namePrefix}X` / `${namePrefix}Y`. */
  namePrefix: string;
  fileInputName: string;
  label: string;
  defaultFocalX?: number;
  defaultFocalY?: number;
  existingImageUrl?: string | null;
  required?: boolean;
}

/**
 * Replaces Sanity Studio's hotspot tool: an <input type="file"> plus a
 * click-on-the-image affordance that stores a fractional (0–1) x/y in
 * hidden fields, submitted alongside the file in the same form. New file
 * selected -> preview swaps to it via an object URL; nothing selected in
 * edit mode -> shows the already-uploaded image instead.
 */
export default function FocalPointPicker({
  namePrefix,
  fileInputName,
  label,
  defaultFocalX = 0.5,
  defaultFocalY = 0.5,
  existingImageUrl = null,
  required = false,
}: FocalPointPickerProps) {
  const [preview, setPreview] = useState<string | null>(existingImageUrl);
  const [focal, setFocal] = useState({ x: defaultFocalX, y: defaultFocalY });
  const boxRef = useRef<HTMLDivElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    setFocal({ x, y });
  }

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <input
        type="file"
        name={fileInputName}
        accept="image/*"
        required={required && !existingImageUrl}
        onChange={handleFileChange}
        className="mt-1 block w-full text-sm"
      />
      {preview && (
        <>
          <div
            ref={boxRef}
            onClick={handleClick}
            role="button"
            aria-label="برای تعیین نقطه‌ی کانونی روی عکس کلیک کنید"
            className="relative mt-2 aspect-[4/5] w-40 cursor-crosshair overflow-hidden rounded border border-zinc-300 bg-zinc-200 bg-cover"
            style={{
              backgroundImage: `url(${preview})`,
              backgroundPosition: `${focal.x * 100}% ${focal.y * 100}%`,
            }}
          >
            <div
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-500 shadow"
              style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            برای تعیین نقطه‌ی کانونی روی عکس کلیک کنید.
          </p>
        </>
      )}
      <input type="hidden" name={`${namePrefix}X`} value={focal.x} />
      <input type="hidden" name={`${namePrefix}Y`} value={focal.y} />
    </div>
  );
}
