"use client";

import { useState } from "react";

import { FilterDropdown, type DropdownOption } from "@/components/filters/FilterDropdown";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  countActiveCategories,
  hasActiveFilters,
  type FilterState,
} from "@/lib/filters/filter-types";
import { REGIONS } from "@/lib/utils/region-config";
import {
  AVERAGE_BEDS_RANGES,
  HOSPITAL_COUNT_RANGES,
  LARGEST_HOSPITAL_BEDS_RANGES,
  SIZE_TIER_NAMES,
  TOTAL_BEDS_RANGES,
} from "@/lib/utils/size-tier";

interface FilterBarProps {
  state: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  /** Unique state codes present in the data, sorted. */
  availableStates: string[];
}

/** A toggle button for boolean filters (conflicting claims, missing system, etc.). */
function BooleanToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-line bg-canvas text-ink-muted hover:bg-surface hover:text-ink"
      }`}
    >
      <span>{label}</span>
      {active && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

/** Segmented control for the multi-state / single-state toggle. */
function MultiStateToggle({
  mode,
  onChange,
}: {
  mode: "multi" | "single" | null;
  onChange: (mode: "multi" | "single" | null) => void;
}) {
  const options: { value: "multi" | "single" | null; label: string }[] = [
    { value: null, label: "All" },
    { value: "multi", label: "Multi-state" },
    { value: "single", label: "Single-state" },
  ];
  return (
    <div
      role="group"
      aria-label="System footprint"
      className="inline-flex items-center rounded-md border border-line bg-surface p-0.5"
    >
      {options.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
              active
                ? "bg-canvas text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** The "Clear All" button shown when filters are active. */
function ClearAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-md border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      Clear All
    </button>
  );
}

/**
 * Advanced filter bar with all five filter categories. Styled like modern SaaS
 * filter controls (Spotify, Linear) with dropdown buttons, toggle chips, and
 * a segmented control for the multi-state toggle.
 *
 * Responsive behavior (VAL-FILTER-062):
 * - At desktop widths (≥ 768px / Tailwind `md`), the full filter bar renders
 *   inline and stays sticky at the top of the table during scroll
 *   (VAL-FILTER-055).
 * - At narrow viewports (< 768px), the advanced filters collapse into a
 *   compact "Filters" button. Tapping it opens a collapsible panel containing
 *   the same controls, so the table remains accessible instead of being
 *   pushed off-screen by a ~1000px-tall always-visible bar. Dropdown panels
 *   are width-constrained so they never overflow the narrow viewport.
 *
 * All filters apply instantly client-side with AND across categories and OR
 * within categories.
 */
export function FilterBar({ state, onChange, onReset, availableStates }: FilterBarProps) {
  // Narrow-viewport detection. Defaults to false (desktop) so the server
  // render and first client paint show the full bar — no hydration mismatch.
  const isNarrow = useMediaQuery("(max-width: 767px)");
  const [panelOpen, setPanelOpen] = useState(false);

  const stateOptions: DropdownOption[] = availableStates.map((s) => ({
    value: s,
    label: s,
  }));

  const regionOptions: DropdownOption[] = REGIONS.map((r) => ({
    value: r.name,
    label: r.name,
  }));

  const hospitalCountOptions: DropdownOption[] = HOSPITAL_COUNT_RANGES.map((r) => ({
    value: r.id,
    label: r.label,
  }));

  const totalBedsOptions: DropdownOption[] = TOTAL_BEDS_RANGES.map((r) => ({
    value: r.id,
    label: r.label,
  }));

  const avgBedsOptions: DropdownOption[] = AVERAGE_BEDS_RANGES.map((r) => ({
    value: r.id,
    label: r.label,
  }));

  const largestBedsOptions: DropdownOption[] = LARGEST_HOSPITAL_BEDS_RANGES.map((r) => ({
    value: r.id,
    label: r.label,
  }));

  const sizeTierOptions: DropdownOption[] = SIZE_TIER_NAMES.map((name) => ({
    value: name,
    label: name,
  }));




  const active = hasActiveFilters(state);
  const activeCount = countActiveCategories(state);

  // The shared set of filter controls, reused by both the desktop inline bar
  // and the narrow-viewport collapsible panel so functionality is identical.
  const filterControls = (
    <>
      {/* Geography */}
      <FilterDropdown
        label="State"
        selected={state.states}
        options={stateOptions}
        onChange={(selected) => onChange({ states: selected })}
        searchable
        searchPlaceholder="Search states…"
      />
      <MultiStateToggle
        mode={state.multiStateMode}
        onChange={(mode) => onChange({ multiStateMode: mode })}
      />
      <FilterDropdown
        label="Region"
        selected={state.regions}
        options={regionOptions}
        onChange={(selected) => onChange({ regions: selected })}
      />

      <div className="h-4 w-px bg-line" aria-hidden="true" />

      {/* Health System Size */}
      <FilterDropdown
        label="Hospitals"
        selected={state.hospitalCountRanges}
        options={hospitalCountOptions}
        onChange={(selected) => onChange({ hospitalCountRanges: selected })}
      />
      <FilterDropdown
        label="Total Beds"
        selected={state.totalBedsRanges}
        options={totalBedsOptions}
        onChange={(selected) => onChange({ totalBedsRanges: selected })}
      />
      <FilterDropdown
        label="Avg Beds"
        selected={state.averageBedsRanges}
        options={avgBedsOptions}
        onChange={(selected) => onChange({ averageBedsRanges: selected })}
      />
      <FilterDropdown
        label="Largest Beds"
        selected={state.largestHospitalBedsRanges}
        options={largestBedsOptions}
        onChange={(selected) => onChange({ largestHospitalBedsRanges: selected })}
      />
      <FilterDropdown
        label="Size Tier"
        selected={state.sizeTiers}
        options={sizeTierOptions}
        onChange={(selected) => onChange({ sizeTiers: selected })}
      />

      <div className="h-4 w-px bg-line" aria-hidden="true" />

      <BooleanToggle
        label="Missing System"
        active={state.missingHealthSystemOnly}
        onClick={() => onChange({ missingHealthSystemOnly: !state.missingHealthSystemOnly })}
      />

      <div className="h-4 w-px bg-line" aria-hidden="true" />

    </>
  );

  // ── Narrow viewport: compact "Filters" button + collapsible panel ──
  if (isNarrow) {
    return (
      <div className="border-b border-line bg-canvas/95 backdrop-blur">
        <div className="flex items-center gap-2 px-4 py-2">
          <button
            type="button"
            aria-expanded={panelOpen}
            aria-controls="filter-panel"
            aria-label="Filters"
            onClick={() => setPanelOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
              activeCount > 0
                ? "border-accent bg-accent-soft text-accent"
                : "border-line bg-canvas text-ink-muted hover:bg-surface hover:text-ink"
            }`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1 3h10M3 6h6M5 9h2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span>Filters</span>
            {activeCount > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                {activeCount}
              </span>
            )}
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              aria-hidden="true"
              className={`transition-transform ${panelOpen ? "rotate-180" : ""}`}
            >
              <path
                d="M2.5 3.5L5 6.5L7.5 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {active && (
            <ClearAllButton onClick={onReset} />
          )}
        </div>
        {panelOpen && (
          <div
            id="filter-panel"
            role="toolbar"
            aria-label="Table filters"
            className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3"
          >
            {filterControls}
          </div>
        )}
      </div>
    );
  }

  // ── Desktop: full inline sticky bar (unchanged behavior) ──
  return (
    <div
      role="toolbar"
      aria-label="Table filters"
      className="flex flex-wrap items-center gap-2 border-b border-line bg-canvas/95 px-5 py-2 backdrop-blur"
    >
      {filterControls}
      {active && (
        <div className="ml-auto">
          <ClearAllButton onClick={onReset} />
        </div>
      )}
    </div>
  );
}
