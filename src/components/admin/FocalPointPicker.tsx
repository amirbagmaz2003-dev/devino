"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_UPLOAD_BYTES, MESSAGES } from "@/lib/adminForm";
import { resizeForUpload } from "@/lib/imageResize";
import {
  MAX_VIDEO_BYTES,
  VARIANT_WIDTHS,
  VIDEO_TYPES,
  variantField,
} from "@/lib/mediaVariants";
import { FieldError, useAdminForm } from "./AdminForm";

const VIDEO_TOO_LARGE = "حجم ویدیو باید کمتر از ۲۰ مگابایت باشد.";

interface FocalPointPickerProps {
  /** Hidden inputs are submitted as `${namePrefix}X` / `${namePrefix}Y`. */
  namePrefix: string;
  fileInputName: string;
  label: string;
  defaultFocalX?: number;
  defaultFocalY?: number;
  existingImageUrl?: string | null;
  required?: boolean;
  /** Also accept video/mp4 and video/webm (the home hero). Videos are
   * never resized and have no focal point. */
  acceptVideo?: boolean;
  /** What `existingImageUrl` points at, so a current video previews as one. */
  existingType?: "image" | "video";
}

/**
 * Replaces Sanity Studio's hotspot tool: an <input type="file"> plus a
 * click-on-the-image affordance that stores a fractional (0–1) x/y in
 * hidden fields, submitted alongside the file in the same form. A newly
 * chosen file is size-checked, resized in the browser, swapped into the
 * file input, and previewed from the resized version — so the focal point
 * is picked on exactly the image that gets uploaded. The 800/1600px
 * variants (brief 03, §8) are generated at the same time and submitted in
 * hidden file inputs next to it. Nothing selected in edit mode -> shows
 * the already-uploaded image instead.
 */
export default function FocalPointPicker({
  namePrefix,
  fileInputName,
  label,
  defaultFocalX = 0.5,
  defaultFocalY = 0.5,
  existingImageUrl = null,
  required = false,
  acceptVideo = false,
  existingType = "image",
}: FocalPointPickerProps) {
  const [preview, setPreview] = useState<string | null>(existingImageUrl);
  const [previewType, setPreviewType] = useState<"image" | "video">(existingType);
  const variantRefs = useRef<Partial<Record<number, HTMLInputElement | null>>>({});
  const [focal, setFocal] = useState({ x: defaultFocalX, y: defaultFocalY });
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  const { setBusy } = useAdminForm();

  function showPreview(url: string | null, type: "image" | "video" = existingType) {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = url && url !== existingImageUrl ? url : null;
    setPreview(url);
    setPreviewType(type);
  }

  function setVariantFiles(files: Partial<Record<number, File>>) {
    for (const width of VARIANT_WIDTHS) {
      const input = variantRefs.current[width];
      if (!input) continue;
      const transfer = new DataTransfer();
      const file = files[width];
      if (file) transfer.items.add(file);
      input.files = transfer.files;
    }
  }

  // Back to the initial state when the surrounding form is reset (e.g.
  // after "add image" succeeds), and release the last object URL on unmount.
  useEffect(() => {
    const form = fileRef.current?.form;
    function handleReset() {
      showPreview(existingImageUrl);
      setVariantFiles({});
      setFocal({ x: defaultFocalX, y: defaultFocalY });
      setError(null);
    }
    form?.addEventListener("reset", handleReset);
    return () => {
      form?.removeEventListener("reset", handleReset);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingImageUrl, defaultFocalX, defaultFocalY]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setError(null);
    setVariantFiles({});
    if (!file) {
      showPreview(existingImageUrl);
      return;
    }

    if (acceptVideo && (VIDEO_TYPES as readonly string[]).includes(file.type)) {
      if (file.size > MAX_VIDEO_BYTES) {
        input.value = "";
        showPreview(existingImageUrl);
        setError(VIDEO_TOO_LARGE);
        return;
      }
      showPreview(URL.createObjectURL(file), "video");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      input.value = "";
      showPreview(existingImageUrl);
      setError(MESSAGES.fileTooLarge);
      return;
    }

    setBusy(true);
    try {
      const resized = await resizeForUpload(file, file.name);
      if (resized) {
        const transfer = new DataTransfer();
        transfer.items.add(resized.original);
        input.files = transfer.files;
        setVariantFiles(resized.variants);
      }
      showPreview(URL.createObjectURL(resized?.original ?? file), "image");
    } finally {
      setBusy(false);
    }
  }

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width),
    );
    const y = Math.min(
      1,
      Math.max(0, (event.clientY - rect.top) / rect.height),
    );
    setFocal({ x, y });
  }

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <input
        ref={fileRef}
        type="file"
        name={fileInputName}
        accept={acceptVideo ? "image/*,video/mp4,video/webm" : "image/*"}
        required={required && !existingImageUrl}
        onChange={handleFileChange}
        className="mt-1 block w-full text-sm"
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
      <FieldError name="file" />
      {VARIANT_WIDTHS.map((width) => (
        <input
          key={width}
          ref={(el) => {
            variantRefs.current[width] = el;
          }}
          type="file"
          name={variantField(fileInputName, width)}
          hidden
          tabIndex={-1}
          aria-hidden
        />
      ))}
      {preview && previewType === "video" && (
        <video
          src={preview}
          muted
          loop
          playsInline
          autoPlay
          aria-label={label}
          className="mt-2 aspect-video w-64 rounded border border-zinc-300 bg-zinc-200 object-cover"
        />
      )}
      {preview && previewType === "image" && (
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
      {previewType === "image" && (
        <>
          <input type="hidden" name={`${namePrefix}X`} value={focal.x} />
          <input type="hidden" name={`${namePrefix}Y`} value={focal.y} />
        </>
      )}
    </div>
  );
}
