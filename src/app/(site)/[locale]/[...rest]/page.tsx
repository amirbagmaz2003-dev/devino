import { notFound } from "next/navigation";

/** Any unknown path under /fa or /en -> the localized not-found page (404). */
export default function CatchAllNotFound() {
  notFound();
}
