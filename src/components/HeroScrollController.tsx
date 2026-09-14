"use client";

import { useEffect } from "react";

const DARK = [0, 0, 0] as const; // matte-black
const LIGHT = [248, 246, 240] as const; // pearl-white
// Switches well before the background finishes tweening to pearl-white —
// waiting for the halfway point left header text sitting on a mid-gray
// background with too little contrast to read comfortably mid-scroll.
const LIGHT_THRESHOLD = 0.3;

function mixChannel(from: number, to: number, t: number) {
  return Math.round(from + (to - from) * t);
}

function mixColor(t: number) {
  const [r, g, b] = DARK.map((channel, i) => mixChannel(channel, LIGHT[i], t));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Drives the homepage's scroll-linked dark→light background (CLAUDE.md —
 * "رفتار اسکرول هدر") and the fixed header's crossfade (CLAUDE.md —
 * "لوگو"). Mounted only on the homepage; everywhere else the header and
 * body keep their static Tailwind defaults untouched.
 *
 * Colors are written directly via imperative style/class mutation inside
 * a rAF loop rather than React state, so scrolling never triggers a
 * re-render — this is the "optimized scroll listener" phase 3 asks for.
 * The background itself is a continuous, scroll-linked tween; the header
 * text/logo color is a threshold-crossing class toggle instead (a
 * continuous black↔white tween would pass through muddy grays — see
 * globals.css for the transition that makes that swap a clean crossfade).
 */
export default function HeroScrollController() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-site-header]");
    if (!header) return;

    let rafId: number | null = null;

    const apply = () => {
      rafId = null;
      const heroHeight = window.innerHeight;
      const progress = Math.min(1, Math.max(0, window.scrollY / heroHeight));
      const color = mixColor(progress);

      document.body.style.backgroundColor = color;
      header.style.backgroundColor = color;
      header.classList.toggle("is-light", progress > LIGHT_THRESHOLD);
    };

    const onScroll = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(apply);
      }
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.body.style.backgroundColor = "";
      header.style.backgroundColor = "";
      header.classList.remove("is-light");
    };
  }, []);

  return null;
}
