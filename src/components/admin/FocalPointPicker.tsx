"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_UPLOAD_BYTES, MESSAGES } from "@/lib/adminForm";
import { FieldError, useAdminForm } from "./AdminForm";

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

/** Longest edge after resizing; phone photos (5–10 MB) come out ~1 MB. */
const MAX_EDGE_PX = 2400;
const JPEG_QUALITY = 0.85;

/**
 * Downscales to MAX_EDGE_PX and re-encodes as JPEG. `imageOrientation:
 * "from-image"` applies the EXIF rotation while decoding, so the pixels
 * come out upright and the (EXIF-less) JPEG displays the same way. Falls
 * back to the original file for formats the browser can't decode.
 */
async function resizeImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  const scale = Math.min(
    1,
    MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // JPEG has no alpha: flatten transparent PNGs onto white, not black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) return file;
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/**
 * Replaces Sanity Studio's hotspot tool: an <input type="file"> plus a
 * click-on-the-image affordance that stores a fractional (0–1) x/y in
 * hidden fields, submitted alongside the file in the same form. A newly
 * chosen file is size-checked, resized in the browser, swapped into the
 * file input, and previewed from the resized version — so the focal point
 * is picked on exactly the image that gets uploaded. Nothing selected in
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
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  const { setBusy } = useAdminForm();

  function showPreview(url: string | null) {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = url && url !== existingImageUrl ? url : null;
    setPreview(url);
  }

  // Back to the initial state when the surrounding form is reset (e.g.
  // after "add image" succeeds), and release the last object URL on unmount.
  useEffect(() => {
    const form = fileRef.current?.form;
    function handleReset() {
      showPreview(existingImageUrl);
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
    if (!file) {
      showPreview(existingImageUrl);
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
      const resized = await resizeImage(file);
      if (resized !== file) {
        const transfer = new DataTransfer();
        transfer.items.add(resized);
        input.files = transfer.files;
      }
      showPreview(URL.createObjectURL(resized));
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
        accept="image/*"
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
