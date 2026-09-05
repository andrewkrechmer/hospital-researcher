"use client";

import { useEffect, useState } from "react";

/**
 * Subscribe to a CSS media query and return whether it currently matches.
 *
 * SSR-safe: on the server (and when `matchMedia` is unavailable) the initial
 * value is `false`, so server-rendered markup defaults to the desktop/full
 * layout. On the client, a lazy initializer reads the current match
 * synchronously so the first client paint already reflects the real
 * viewport — no desktop→narrow flash. A `useEffect` then keeps the value in
 * sync if the viewport changes (e.g. rotating a device or resizing the
 * window).
 *
 * Note: when the client viewport differs from the server default, React
 * emits a hydration warning and patches the DOM. This is the standard
 * trade-off for responsive client-only layouts and does not break
 * functionality.
 *
 * @example
 * const isNarrow = useMediaQuery("(max-width: 767px)");
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
