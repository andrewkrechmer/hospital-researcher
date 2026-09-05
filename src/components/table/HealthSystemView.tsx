"use client";

import { type SortingState } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";

import { ActiveFilterPills } from "@/components/filters/ActiveFilterPills";
import { FilterBar } from "@/components/filters/FilterBar";
import { QuickFilterChips } from "@/components/filters/QuickFilterChips";
import { SearchBar } from "@/components/search/SearchBar";
import { HospitalDrawer } from "@/components/drawers/HospitalDrawer";
import { HealthSystemDrawer } from "@/components/drawers/HealthSystemDrawer";
import { HealthSystemTable } from "@/components/table/HealthSystemTable";
import { HospitalTable } from "@/components/table/HospitalTable";
import { ViewToggle, type TableView } from "@/components/table/ViewToggle";
import { useFilters } from "@/hooks/useFilters";
import {
  filterHealthSystems,
  filterHospitals,
  getFilteredIndependents,
} from "@/lib/filters/filter-logic";
import { hasActiveFilters } from "@/lib/filters/filter-types";
import { useTableData } from "@/hooks/useTableData";

function LoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
        <p className="text-sm text-ink-muted">Loading hospitals and health systems…</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-red-700">Failed to load data</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md border border-line bg-canvas px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function EmptyDatabaseState() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-ink">No data yet</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          No hospitals are available in the connected database.
        </p>
      </div>
    </div>
  );
}

/** Empty state shown when filters produce no results (VAL-FILTER-057). */
function FilterEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-ink">No results match your filters</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Try adjusting or clearing your filters to see more results.
        </p>
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-md border border-line bg-canvas px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Clear all filters
        </button>
      </div>
    </div>
  );
}

/**
 * Full Hospitals panel: fetches all data once on mount, manages loading /
 * error / empty states, and renders the Health System View or Hospital View
 * table depending on the active toggle.
 *
 * Filter state is shared across both views so switching views preserves the
 * active filters (VAL-FILTER-036). All filtering is client-side and instant
 * (VAL-FILTER-053).
 */
export function HealthSystemView() {
  const { hospitals, healthSystems, loading, error, retry } = useTableData();
  const { state: filterState, update: updateFilters, reset: resetFilters, setSearchTerm } = useFilters();

  const [view, setView] = useState<TableView>("health-system");
  const [healthSystemSorting, setHealthSystemSorting] = useState<SortingState>([]);
  const [hospitalSorting, setHospitalSorting] = useState<SortingState>([]);

  // Hospital detail drawer state. The drawer is an overlay so the table stays
  // mounted underneath, preserving filters/search/sort/expansion (VAL-DRAWER-006).
  const [drawerHospitalId, setDrawerHospitalId] = useState<string | null>(null);

  // Health system detail drawer state (VAL-DRAWER-029). Same overlay approach.
  const [drawerHealthSystemId, setDrawerHealthSystemId] = useState<string | null>(null);

  const openHospitalDrawer = useCallback(
    (hospitalId: string) => {
      setDrawerHospitalId(hospitalId);
    },
    [],
  );
  const closeHospitalDrawer = useCallback(() => {
    setDrawerHospitalId(null);
  }, []);

  const openHealthSystemDrawer = useCallback((healthSystemId: string) => {
    setDrawerHealthSystemId(healthSystemId);
  }, []);
  const closeHealthSystemDrawer = useCallback(() => {
    setDrawerHealthSystemId(null);
  }, []);

  /** When a hospital is clicked from inside the health system drawer, close
   *  the system drawer and open the hospital drawer instead. */
  const handleHospitalClickFromSystemDrawer = useCallback((hospitalId: string) => {
    setDrawerHealthSystemId(null);
    setDrawerHospitalId(hospitalId);
  }, []);

  // Compute available states from the data for the State filter dropdown.
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    for (const h of hospitals) {
      if (h.state) states.add(h.state);
    }
    return Array.from(states).sort();
  }, [hospitals]);

  // Apply filters to the full dataset (client-side, instant).
  const filteredHospitals = useMemo(
    () => filterHospitals(hospitals, healthSystems, filterState),
    [hospitals, healthSystems, filterState],
  );

  const filteredHealthSystems = useMemo(
    () => filterHealthSystems(healthSystems, filteredHospitals, filterState),
    [healthSystems, filteredHospitals, filterState],
  );

  // For Health System View, include independent hospitals in the tree.
  const treeHospitals = useMemo(() => {
    // When system-level filters are active, independents are already excluded
    // from filteredHospitals. When no system-level filters, include independents
    // that pass hospital-level filters.
    return filteredHospitals;
  }, [filteredHospitals]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (hospitals.length === 0 && healthSystems.length === 0) {
    return <EmptyDatabaseState />;
  }

  const filtersActive = hasActiveFilters(filterState);

  // Check if the current view has no results due to filters
  const isHealthSystemEmpty = view === "health-system" && filteredHealthSystems.length === 0 && getFilteredIndependents(treeHospitals).length === 0;
  const isHospitalEmpty = view === "hospital" && filteredHospitals.length === 0;
  const showFilterEmpty = filtersActive && (isHealthSystemEmpty || isHospitalEmpty);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-2">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            {view === "health-system" ? "Health System View" : "Hospital View"}
          </h2>
          <SearchBar value={filterState.searchTerm} onChange={setSearchTerm} />
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={retry} className="text-xs font-medium text-ink-muted hover:text-ink">Refresh data</button>
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      <div className="sticky top-0 z-30">
        <FilterBar
          state={filterState}
          onChange={updateFilters}
          onReset={resetFilters}
          availableStates={availableStates}
        />
        <QuickFilterChips
          state={filterState}
          onChange={updateFilters}
          availableStates={availableStates}
        />
        <ActiveFilterPills
          state={filterState}
          onRemove={updateFilters}
        />
      </div>

      {showFilterEmpty ? (
        <FilterEmptyState onClear={resetFilters} />
      ) : view === "health-system" ? (
        <HealthSystemTable
          hospitals={treeHospitals}
          healthSystems={filteredHealthSystems}
          sorting={healthSystemSorting}
          onSortingChange={setHealthSystemSorting}
          onHospitalClick={openHospitalDrawer}
          onHealthSystemClick={openHealthSystemDrawer}
        />
      ) : (
        <HospitalTable
          hospitals={filteredHospitals}
          sorting={hospitalSorting}
          onSortingChange={setHospitalSorting}
          onHospitalClick={openHospitalDrawer}
        />
      )}

      <HospitalDrawer
        hospitalId={drawerHospitalId}
        onClose={closeHospitalDrawer}
      />

      <HealthSystemDrawer
        healthSystemId={drawerHealthSystemId}
        onClose={closeHealthSystemDrawer}
        onHospitalClick={handleHospitalClickFromSystemDrawer}
      />
    </div>
  );
}
