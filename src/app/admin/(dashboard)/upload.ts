import { MAX_UPLOAD_BYTES, MESSAGES } from "@/lib/adminForm";
import {
  MAX_VIDEO_BYTES,
  VARIANT_WIDTHS,
  VIDEO_TYPES,
  variantField,
  type VariantWidth,
} from "@/lib/mediaVariants";

const VIDEO_TOO_LARGE = "حجم ویدیو باید کمتر از ۲۰ مگابایت باشد.";

export interface UploadedFile {
  file: File | null;
  type: "image" | "video";
  /** 800/1600px JPEG variants generated in the browser (images only). */
  variants: Partial<Record<VariantWidth, File>>;
  error?: string;
}

function readFile(formData: FormData, name: string): File | null {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

/**
 * Reads an optional file field plus its variant fields. The browser
 * already resizes images before upload (see FocalPointPicker); this is
 * the server-side backstop for the 15 MB image / 20 MB video caps in case
 * that step was skipped (old browser, JS failure).
 */
export function readUploadedFile(
  formData: FormData,
  name: string,
  { allowVideo = false } = {},
): UploadedFile {
  const file = readFile(formData, name);
  if (!file) return { file: null, type: "image", variants: {} };

  if (allowVideo && (VIDEO_TYPES as readonly string[]).includes(file.type)) {
    if (file.size > MAX_VIDEO_BYTES) {
      return { file: null, type: "video", variants: {}, error: VIDEO_TOO_LARGE };
    }
    return { file, type: "video", variants: {} };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { file: null, type: "image", variants: {}, error: MESSAGES.fileTooLarge };
  }
  const variants: Partial<Record<VariantWidth, File>> = {};
  for (const width of VARIANT_WIDTHS) {
    const variant = readFile(formData, variantField(name, width));
    if (variant && variant.type === "image/jpeg" && variant.size <= MAX_UPLOAD_BYTES) {
      variants[width] = variant;
    }
  }
  return { file, type: "image", variants };
}
