"use client";

import {
  type ExpandedState,
  type OnChangeFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";

import { HEALTH_SYSTEM_COLUMNS } from "@/components/table/health-system-columns";
import {
  type OpenHospitalDrawerOptions,
  RowActionProvider,
} from "@/components/table/RowActionContext";
import {
  type HealthSystemRow,
  buildHealthSystemRows,
  getSubRows,
} from "@/lib/table/health-system-rows";
import type { HealthSystemRecord, HospitalRecord } from "@/lib/types";

const ROW_HEIGHT = 36;

interface HealthSystemTableProps {
  hospitals: HospitalRecord[];
  healthSystems: HealthSystemRecord[];
  /** Controlled sort state. When omitted, the table manages its own state. */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  /** Called when a hospital child row is clicked (opens the detail drawer). */
  onHospitalClick?: (hospitalId: string, options?: OpenHospitalDrawerOptions) => void;
  /** Called when a health system parent row is clicked (opens the system drawer). */
  onHealthSystemClick?: (healthSystemId: string) => void;
}

function SortIndicator({ state }: { state: false | "asc" | "desc" }) {
  if (!state) return null;
  return (
    <span className="ml-1 text-ink-subtle" aria-hidden="true">
      {state === "asc" ? "↑" : "↓"}
    </span>
  );
}

export function HealthSystemTable({
  hospitals,
  healthSystems,
  sorting: sortingProp,
  onSortingChange: onSortingChangeProp,
  onHospitalClick,
  onHealthSystemClick,
}: HealthSystemTableProps) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const sorting = sortingProp ?? internalSorting;
  const onSortingChange: OnChangeFn<SortingState> =
    onSortingChangeProp ?? setInternalSorting;
  const [expansion, setExpansion] = useState<ExpandedState>({});

  const rowActionValue = {
    openHospitalDrawer: (id: string, opts?: OpenHospitalDrawerOptions) =>
      onHospitalClick?.(id, opts),
  };

  const rows = useMemo(
    () => buildHealthSystemRows(healthSystems, hospitals),
    [healthSystems, hospitals],
  );

  const table = useReactTable<HealthSystemRow>({
    data: rows,
    columns: HEALTH_SYSTEM_COLUMNS,
    state: { sorting, expanded: expansion },
    onSortingChange,
    onExpandedChange: setExpansion,
    getSubRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
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
    () => HEALTH_SYSTEM_COLUMNS.reduce((sum, col) => sum + (col.size ?? 120), 0),
    [],
  );

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();

  if (flatRows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold text-ink">No health systems found</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            The database has no hospitals or health systems to display. Try
            importing an Excel file or running the seed script to load sample
            data.
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
      aria-label="Health System View"
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
          const original = row.original;
          const isGroup = original.kind === "group";
          const hospitalId =
            original.kind === "hospital" ? original.hospital.id : null;
          const hospitalClickable = !isGroup && onHospitalClick && hospitalId != null;
          // Group rows are clickable only for real health systems (not the
          // synthetic independent or orphan groups whose IDs start with "__").
          const systemId =
            isGroup && original.kind === "group" && !original.id.startsWith("__")
              ? original.id
              : null;
          const systemClickable = systemId != null && onHealthSystemClick != null;
          const clickable = hospitalClickable || systemClickable;
          const clickId = hospitalId ?? systemId;
          const clickHandler =
            clickable && clickId != null
              ? hospitalClickable && hospitalId != null
                ? () => onHospitalClick!(hospitalId)
                : () => onHealthSystemClick!(clickId)
              : undefined;
          return (
            <div
              key={row.id}
              role="row"
              data-row-id={row.id}
              data-row-type={isGroup ? "group" : "hospital"}
              data-depth={row.depth}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickHandler}
              onKeyDown={
                clickable && clickId != null
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (hospitalClickable && hospitalId != null) {
                          onHospitalClick!(hospitalId);
                        } else if (systemClickable) {
                          onHealthSystemClick!(clickId);
                        }
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
                isGroup ? "bg-surface/50 font-medium" : ""
              } ${clickable ? "cursor-pointer focus-visible:bg-surface focus-visible:outline-none" : ""}`}
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
