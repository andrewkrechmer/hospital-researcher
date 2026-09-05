"use client";

import {
  type OnChangeFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";

import { HOSPITAL_COLUMNS } from "@/components/table/hospital-columns";
import {
  type OpenHospitalDrawerOptions,
  RowActionProvider,
} from "@/components/table/RowActionContext";
import type { HospitalRecord } from "@/lib/types";

const ROW_HEIGHT = 36;

interface HospitalTableProps {
  hospitals: HospitalRecord[];
  /** Controlled sort state. When omitted, the table manages its own state. */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  /** Called when a hospital row is clicked (opens the detail drawer). */
  onHospitalClick?: (hospitalId: string, options?: OpenHospitalDrawerOptions) => void;
}

function SortIndicator({ state }: { state: false | "asc" | "desc" }) {
  if (!state) return null;
  return (
    <span className="ml-1 text-ink-subtle" aria-hidden="true">
      {state === "asc" ? "↑" : "↓"}
    </span>
  );
}

/**
 * Flat, non-hierarchical table showing one row per hospital with all 14
 * required columns. Virtualized via @tanstack/react-virtual. Sorting is
 * controlled by the parent (or internal state when no props are passed) so
 * the container can keep sort state coherent across view toggles.
 */
export function HospitalTable({
  hospitals,
  sorting: sortingProp,
  onSortingChange: onSortingChangeProp,
  onHospitalClick,
}: HospitalTableProps) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const sorting = sortingProp ?? internalSorting;
  const onSortingChange: OnChangeFn<SortingState> =
    onSortingChangeProp ?? setInternalSorting;

  const rowActionValue = {
    openHospitalDrawer: (id: string, opts?: OpenHospitalDrawerOptions) =>
      onHospitalClick?.(id, opts),
  };

  const table = useReactTable<HospitalRecord>({
    data: hospitals,
    columns: HOSPITAL_COLUMNS,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows: flatRows } = table.getRowModel();
  const scrollRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const totalWidth = useMemo(
    () => HOSPITAL_COLUMNS.reduce((sum, col) => sum + (col.size ?? 120), 0),
    [],
  );

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();

  if (flatRows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold text-ink">No hospitals found</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            There are no hospitals to display. Try importing an Excel file or
            running the seed script to load sample data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RowActionProvider value={rowActionValue}>
    <div
      ref={scrollRef}
      className="relative flex-1 overflow-auto"
      role="table"
      aria-label="Hospital View"
    >
      {/* Sticky header */}
      <div
        className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur"
        role="rowgroup"
      >
        {table.getHeaderGroups().map((headerGroup) => (
          <div
            key={headerGroup.id}
            className="flex"
            role="row"
            style={{ minWidth: totalWidth, height: ROW_HEIGHT }}
          >
            {headerGroup.headers.map((header) => {
              const sortState = header.column.getIsSorted();
              const canSort = header.column.getCanSort();
              return (
                <div
                  key={header.id}
                  role="columnheader"
                  aria-sort={
                    sortState === "asc"
                      ? "ascending"
                      : sortState === "desc"
                        ? "descending"
                        : "none"
                  }
                  style={{ width: header.getSize(), minWidth: header.getSize() }}
                  className="flex shrink-0 items-center border-r border-line px-3 text-xs font-semibold uppercase tracking-wide text-ink-muted"
                >
                  {header.isPlaceholder ? null : canSort ? (
                    <button
                      type="button"
                      onClick={() => header.column.toggleSorting(undefined)}
                      className="flex items-center rounded outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                      aria-label={`Sort by ${header.column.columnDef.header as string}`}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      <SortIndicator state={sortState} />
                    </button>
                  ) : (
                    <span>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Virtualized body */}
      <div
        style={{ height: totalHeight, position: "relative", minWidth: totalWidth }}
        role="rowgroup"
      >
        {virtualItems.map((virtualRow) => {
          const row = flatRows[virtualRow.index];
          if (!row) return null;
          return (
            <div
              key={row.id}
              role="row"
              data-row-id={row.id}
              data-row-type="hospital"
              tabIndex={onHospitalClick ? 0 : undefined}
              onClick={
                onHospitalClick
                  ? () => onHospitalClick(row.original.id)
                  : undefined
              }
              onKeyDown={
                onHospitalClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onHospitalClick(row.original.id);
                      }
                    }
                  : undefined
              }
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: `translateY(${virtualRow.start}px)`,
                width: "100%",
                height: virtualRow.size,
              }}
              className={`flex items-center border-b border-line/60 transition-colors hover:bg-surface ${
                onHospitalClick ? "cursor-pointer focus-visible:bg-surface focus-visible:outline-none" : ""
              }`}
            >
              {row.getVisibleCells().map((cell) => (
                <div
                  key={cell.id}
                  role="cell"
                  style={{
                    width: cell.column.getSize(),
                    minWidth: cell.column.getSize(),
                  }}
                  className="flex shrink-0 items-center overflow-hidden border-r border-line/40 px-3"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
    </RowActionProvider>
  );
}
