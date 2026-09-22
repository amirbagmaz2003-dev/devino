import { useRef } from "react";

const DRAG_THRESHOLD_PX = 5;

/**
 * A slide inside an Embla carousel can itself be a link (the whole
 * poster, or a product card) — without this, dragging the carousel with
 * the mouse/finger starting on that link fires a click on release and
 * navigates, when the user only meant to swipe. Tracks pointer movement
 * since pointerdown and swallows the click if it moved past a small
 * threshold, on any pointer type (mouse, touch, pen).
 */
export function useDragClickGuard() {
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);

  return {
    onPointerDown: (event: React.PointerEvent) => {
      startPos.current = { x: event.clientX, y: event.clientY };
      dragged.current = false;
    },
    onPointerMove: (event: React.PointerEvent) => {
      if (!startPos.current) return;
      const dx = Math.abs(event.clientX - startPos.current.x);
      const dy = Math.abs(event.clientY - startPos.current.y);
      if (dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX) {
        dragged.current = true;
      }
    },
    onClickCapture: (event: React.MouseEvent) => {
      if (dragged.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
