"use client";

import { useEffect, useRef, useState } from "react";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";

/** Debounce window in ms. Spec requires 100–300ms (VAL-FILTER-044). */
const SEARCH_DEBOUNCE_MS = 200;

interface SearchBarProps {
  /** Current search term from the shared filter state. */
  value: string;
  /** Called with the new (debounced) search term. */
  onChange: (term: string) => void;
  /** Accessible label for the input (default "Search hospitals and health systems"). */
  label?: string;
}

/**
 * Global search bar that filters instantly across hospital name, health
 * system name, domain, city, state, and CMS/CCN.
 *
 * The input maintains a local value for immediate visual feedback while the
 * debounced value is propagated to the shared filter state after a short
 * pause (VAL-FILTER-044). This prevents a table re-render on every keystroke.
 *
 * When the external `value` changes (e.g. the search pill is removed or Clear
 * All is clicked), the local input syncs to match (VAL-FILTER-046,
 * VAL-FILTER-034).
 *
 * All matching is case-insensitive, trimmed, and client-side — no network
 * requests during search (VAL-FILTER-053). Special characters are treated as
 * literal text (VAL-FILTER-060).
 */
export function SearchBar({
  value,
  onChange,
  label = "Search hospitals and health systems",
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);
  const debouncedValue = useDebouncedValue(inputValue, SEARCH_DEBOUNCE_MS);

  // Track whether the latest inputValue change came from the user typing
  // (internal) or from an external sync (pill removal, Clear All). Only
  // user-typed changes should propagate to the parent after debounce.
  const isUserTyping = useRef(false);

  // Propagate the debounced value to the parent filter state, but only when
  // the change originated from the user typing (not from an external sync).
  useEffect(() => {
    if (isUserTyping.current && debouncedValue !== value) {
      isUserTyping.current = false;
      onChange(debouncedValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

  // Sync the local input when the external value changes and differs from
  // what the user already typed (pill removal, Clear All, etc.).
  useEffect(() => {
    if (value !== inputValue) {
      isUserTyping.current = false;
      setInputValue(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative flex items-center">
      {/* Search icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute left-3 text-ink-subtle"
      >
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M11 11L14 14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      <input
        type="search"
        aria-label={label}
        placeholder="Search by name, system, domain, city, state, or CCN…"
        value={inputValue}
        onChange={(e) => {
          isUserTyping.current = true;
          setInputValue(e.target.value);
        }}
        className="w-72 rounded-md border border-line bg-canvas py-1.5 pl-8 pr-8 text-sm text-ink placeholder:text-ink-subtle transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />

      {/* Clear button — only visible when there is text */}
      {inputValue.length > 0 && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            isUserTyping.current = false;
            setInputValue("");
            onChange("");
          }}
          className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 2L8 8M8 2L2 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
