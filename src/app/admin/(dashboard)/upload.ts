import { MAX_UPLOAD_BYTES, MESSAGES } from "@/lib/adminForm";

/**
 * Reads an optional file field. The browser already resizes images before
 * upload (see FocalPointPicker); this is the server-side backstop for the
 * 15 MB cap in case that step was skipped (old browser, JS failure).
 */
export function readUploadedFile(
  formData: FormData,
  name: string,
): { file: File | null; error?: string } {
  const value = formData.get(name);
  if (!(value instanceof File) || value.size === 0) return { file: null };
  if (value.size > MAX_UPLOAD_BYTES)
    return { file: null, error: MESSAGES.fileTooLarge };
  return { file: value };
}
