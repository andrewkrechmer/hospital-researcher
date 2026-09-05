/**
 * Column definitions for the Health System View table.
 *
 * Each column renders different content for parent (group) vs child (hospital)
 * rows. `accessorFn` returns a sortable value for each row type so sorting
 * preserves the tree hierarchy (TanStack Table sorts each level independently).
 */
import type { ColumnDef } from "@tanstack/react-table";

import { SizeTierBadge } from "@/components/ui/Badge";
import { SIZE_TIER_RANK } from "@/lib/utils/size-tier";
import type { HealthSystemRow } from "@/lib/table/health-system-rows";



function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("en-US");
}

function statesText(states: string[]): string {
  return states.length === 0 ? "—" : states.join(", ");
}

export const HEALTH_SYSTEM_COLUMNS: ColumnDef<HealthSystemRow>[] = [
  {
    id: "name",
    header: "Health System",
    size: 260,
    accessorFn: (row) => (row.kind === "group" ? row.name : row.hospital.name),
    cell: ({ row, getValue }) => {
      const isGroup = row.original.kind === "group";
      const canExpand = row.getCanExpand();
      const isExpanded = row.getIsExpanded();
      const name = getValue() as string;

      if (isGroup && row.original.kind === "group") {
        const isIndependent = row.original.groupKind === "independent";
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-expanded={canExpand ? isExpanded : undefined}
              aria-disabled={!canExpand}
              disabled={!canExpand}
              onClick={(e) => {
                e.stopPropagation();
                row.toggleExpanded();
              }}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:opacity-30"
              aria-label={canExpand ? `${isExpanded ? "Collapse" : "Expand"} ${name}` : `${name} has no hospitals`}
            >
              {canExpand ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d={isExpanded ? "M3 4.5L6 7.5L9 4.5" : "M4.5 3L7.5 6L4.5 9"}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={isExpanded ? "transition-transform" : "transition-transform"}
                  />
                </svg>
              ) : (
                <span className="text-xs">·</span>
              )}
            </button>
            <span
              className={`truncate text-sm font-semibold ${isIndependent ? "italic text-ink-muted" : "text-ink"}`}
            >
              {name}
            </span>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2 pl-7">
          <span className="h-1 w-1 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
          <span className="truncate text-sm text-ink-muted">{name}</span>
        </div>
      );
    },
  },
  {
    id: "primaryDomain",
    header: "Primary Domain",
    size: 180,
    accessorFn: (row) =>
      row.kind === "group"
        ? (row.primaryDomain ?? "")
        : (row.hospital.hospitalDomain ?? ""),
    cell: ({ getValue }) => {
      const value = getValue() as string;
      if (!value) return <span className="text-ink-subtle text-xs">—</span>;
      return (
        <span className="text-xs text-ink-muted tabular">{value}</span>
      );
    },
  },
  {
    id: "hospitalCount",
    header: "Hospitals",
    size: 90,
    accessorFn: (row) =>
      row.kind === "group" ? row.metrics.hospitalCount : 0,
    cell: ({ row }) => {
      if (row.original.kind !== "group") return null;
      const count = row.original.metrics.hospitalCount;
      return (
        <span className="text-sm font-medium tabular text-ink">{count}</span>
      );
    },
  },
  {
    id: "totalBeds",
    header: "Total Beds",
    size: 100,
    accessorFn: (row) =>
      row.kind === "group" ? row.metrics.totalBeds : (row.hospital.bedCount ?? 0),
    cell: ({ row }) => {
      const value =
        row.original.kind === "group"
          ? row.original.metrics.totalBeds
          : row.original.hospital.bedCount;
      return (
        <span className="text-sm tabular text-ink">{formatNumber(value)}</span>
      );
    },
  },
  {
    id: "averageBeds",
    header: "Avg Beds",
    size: 90,
    accessorFn: (row) =>
      row.kind === "group" ? (row.metrics.averageBeds ?? -1) : 0,
    cell: ({ row }) => {
      if (row.original.kind !== "group") return null;
      const avg = row.original.metrics.averageBeds;
      return (
        <span className="text-sm tabular text-ink-muted">
          {formatNumber(avg)}
        </span>
      );
    },
  },
  {
    id: "largestHospital",
    header: "Largest Hospital",
    size: 200,
    accessorFn: (row) =>
      row.kind === "group" ? (row.metrics.largestHospitalName ?? "") : "",
    cell: ({ row }) => {
      if (row.original.kind !== "group") return null;
      const name = row.original.metrics.largestHospitalName;
      if (!name) return <span className="text-ink-subtle text-xs">—</span>;
      return (
        <span className="truncate text-xs text-ink-muted">{name}</span>
      );
    },
  },
  {
    id: "largestHospitalBeds",
    header: "Largest Beds",
    size: 100,
    accessorFn: (row) =>
      row.kind === "group" ? (row.metrics.largestHospitalBeds ?? -1) : 0,
    cell: ({ row }) => {
      if (row.original.kind !== "group") return null;
      const beds = row.original.metrics.largestHospitalBeds;
      return (
        <span className="text-sm tabular text-ink-muted">
          {formatNumber(beds)}
        </span>
      );
    },
  },
  {
    id: "states",
    header: "States",
    size: 140,
    accessorFn: (row) =>
      row.kind === "group"
        ? row.metrics.states.length
        : (row.hospital.state ?? ""),
    cell: ({ row }) => {
      if (row.original.kind === "group") {
        return (
          <span className="text-xs text-ink-muted">
            {statesText(row.original.metrics.states)}
          </span>
        );
      }
      const state = row.original.hospital.state;
      if (!state) return <span className="text-ink-subtle text-xs">—</span>;
      return <span className="text-xs tabular text-ink-muted">{state}</span>;
    },
  },
  {
    id: "sizeTier",
    header: "Size Tier",
    size: 110,
    accessorFn: (row) => {
      if (row.kind !== "group") return 0;
      return SIZE_TIER_RANK[row.sizeTier ?? ""] ?? 0;
    },
    cell: ({ row }) => {
      if (row.original.kind !== "group") return null;
      return <SizeTierBadge tier={row.original.sizeTier} />;
    },
  },
];

