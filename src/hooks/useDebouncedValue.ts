"use client";

import { useEffect, useState } from "react";

/**
 * Debounce a rapidly-changing value. Returns a value that only updates after
 * the user stops changing it for `delay` milliseconds.
 *
 * Used by the SearchBar so rapid typing doesn't trigger a table re-render on
 * every keystroke (VAL-FILTER-044). The debounce window is 100–300ms per the
 * feature spec.
 *
 * @param value The rapidly-changing value to debounce.
 * @param delay Milliseconds to wait after the last change before updating.
 * @returns The debounced value, which lags behind `value` by at most `delay`.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
