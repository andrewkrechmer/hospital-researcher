"use client";

import { useCallback, useMemo, useState } from "react";

import { emptyFilterState, type FilterState } from "@/lib/filters/filter-types";

/**
 * Manages filter state for the table. The state is a plain object shared
 * across the filter bar, quick chips, and search bar.
 *
 * Returns the current state, a setter for direct replacement, and helper
 * updaters for each category so callers don't need to spread the whole state.
 */
export function useFilters() {
  const [state, setState] = useState<FilterState>(emptyFilterState);

  const update = useCallback((patch: Partial<FilterState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setState(emptyFilterState());
  }, []);

  const toggleArrayValue = useCallback(
    <K extends keyof FilterState>(key: K, value: string) => {
      setState((prev) => {
        const arr = prev[key];
        if (!Array.isArray(arr)) return prev;
        const set = new Set(arr as string[]);
        if (set.has(value)) {
          set.delete(value);
        } else {
          set.add(value);
        }
        return { ...prev, [key]: Array.from(set) };
      });
    },
    [],
  );

  const setSearchTerm = useCallback((term: string) => {
    setState((prev) => ({ ...prev, searchTerm: term }));
  }, []);

  return useMemo(
    () => ({ state, update, reset, toggleArrayValue, setSearchTerm, setState }),
    [state, update, reset, toggleArrayValue, setSearchTerm],
  );
}
