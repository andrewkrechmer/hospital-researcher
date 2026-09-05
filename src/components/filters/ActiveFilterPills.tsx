"use client";

import { getActivePills } from "@/lib/filters/active-pills";
import { hasActiveFilters, type FilterState } from "@/lib/filters/filter-types";

interface ActiveFilterPillsProps {
  /** Current filter state. */
  state: FilterState;
  /** Called with a partial patch to remove a specific filter. */
  onRemove: (patch: Partial<FilterState>) => void;
}

/** Render a single removable filter pill. */
function Pill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="group inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent-soft py-1 pl-3 pr-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
    >
      <span>{label}</span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
        className="opacity-70 group-hover:opacity-100"
      >
        <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/**
 * Active filter pills row. Shows one removable pill per active filter category
 * (VAL-FILTER-032). Clicking a pill removes that specific filter
 * (VAL-FILTER-033). The entire row is hidden when no filters are active
 * (VAL-FILTER-035). The Clear All button lives in the FilterBar above.
 */
export function ActiveFilterPills({
  state,
  onRemove,
}: ActiveFilterPillsProps) {
  const pills = getActivePills(state);
  const active = hasActiveFilters(state);

  if (!active) return null;

  return (
    <div
      role="group"
      aria-label="Active filters"
      className="flex flex-wrap items-center gap-1.5 border-b border-line bg-surface px-5 py-2"
    >
      {pills.map((pill) => (
        <Pill
          key={pill.id}
          label={pill.label}
          onRemove={() => onRemove(pill.removePatch)}
        />
      ))}
    </div>
  );
}
