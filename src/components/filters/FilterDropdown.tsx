"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  /** Accessible label for the trigger button. */
  label: string;
  /** Currently selected values. */
  selected: string[];
  /** All available options. */
  options: DropdownOption[];
  /** Called when the selection changes (full new array). */
  onChange: (selected: string[]) => void;
  /** Show a search input for long lists. */
  searchable?: boolean;
  /** Placeholder for the search input. */
  searchPlaceholder?: string;
  /** Whether the dropdown is disabled. */
  disabled?: boolean;
}

/**
 * Multi-select dropdown with checkboxes, styled like modern SaaS filter
 * controls (Spotify, Linear). Supports a search input for long lists (e.g.
 * all 50+ states). Click outside or Escape closes the panel.
 *
 * The panel is scrollable when the option list is long (VAL-FILTER-059) and
 * the trigger shows a count badge when items are selected.
 */
export function FilterDropdown({
  label,
  selected,
  options,
  onChange,
  searchable = false,
  searchPlaceholder = "Search…",
  disabled = false,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Close on click outside or Escape
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedSet = new Set(selected);
  const filteredOptions = searchable && search.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(search.trim().toLowerCase()) ||
        opt.value.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : options;

  function toggle(value: string) {
    const newSet = new Set(selectedSet);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    onChange(Array.from(newSet));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:opacity-50 ${
          selected.length > 0
            ? "border-accent bg-accent-soft text-accent"
            : "border-line bg-canvas text-ink-muted hover:bg-surface hover:text-ink"
        }`}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {selected.length}
          </span>
        )}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full z-50 mt-1 w-64 max-w-[calc(100vw-1.5rem)] rounded-lg border border-line bg-canvas shadow-lg"
        >
          {searchable && (
            <div className="border-b border-line p-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded border border-line px-2 py-1 text-xs text-ink outline-none focus:border-accent focus-visible:ring-1 focus-visible:ring-accent"
                aria-label={`Search ${label}`}
              />
            </div>
          )}

          <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
              {selected.length > 0 ? `${selected.length} selected` : "Select options"}
            </span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] font-medium text-accent hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div
            id={listboxId}
            role="listbox"
            aria-multiselectable="true"
            aria-label={label}
            className="max-h-64 overflow-y-auto py-1"
          >
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-xs text-ink-subtle">No options found</p>
            ) : (
              filteredOptions.map((opt) => {
                const checked = selectedSet.has(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-ink hover:bg-surface"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt.value)}
                      className="h-3.5 w-3.5 rounded border-line text-accent focus-visible:ring-1 focus-visible:ring-accent"
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
