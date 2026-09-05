"use client";

import { buildQuickChips, type QuickChip } from "@/lib/filters/quick-chips";
import type { FilterState } from "@/lib/filters/filter-types";

interface QuickFilterChipsProps {
  /** Current filter state (shared with the advanced FilterBar). */
  state: FilterState;
  /** Called with a partial patch when a chip is toggled. */
  onChange: (patch: Partial<FilterState>) => void;
  /** Unique state codes present in the data, sorted. */
  availableStates: string[];
}

/** Render a single quick filter chip. */
function Chip({
  chip,
  active,
  onClick,
}: {
  chip: QuickChip;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-line bg-canvas text-ink-muted hover:bg-surface hover:text-ink"
      }`}
    >
      <span>{chip.label}</span>
      {active && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

/**
 * Quick filter chips for one-click filtering. Fixed chips (Enterprise,
 * Independent, 40+ Hospitals, 1000+ Beds, Missing Domain, Conflicts) plus a
 * chip for each available state.
 *
 * Chips share the same FilterState as the advanced FilterBar, so activating a
 * chip updates the corresponding filter control and vice-versa
 * (VAL-FILTER-031). Clicking an active chip deactivates it (VAL-FILTER-029).
 * Multiple chips can be active simultaneously (VAL-FILTER-030).
 */
export function QuickFilterChips({
  state,
  onChange,
  availableStates,
}: QuickFilterChipsProps) {
  const chips = buildQuickChips(availableStates);

  return (
    <div
      role="group"
      aria-label="Quick filters"
      className="flex flex-wrap items-center gap-1.5 border-b border-line bg-canvas px-5 py-2"
    >
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
        Quick
      </span>
      {chips.map((chip) => (
        <Chip
          key={chip.id}
          chip={chip}
          active={chip.isActive(state)}
          onClick={() => onChange(chip.toggle(state))}
        />
      ))}
    </div>
  );
}
