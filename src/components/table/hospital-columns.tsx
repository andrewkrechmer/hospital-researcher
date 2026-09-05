/**
 * Column definitions for the Hospital View (flat, one-row-per-hospital) table.
 *
 * Only columns supplied by the current Postgres tables are shown. Numeric
 * columns sort numerically and text/domains/states lexically; display strings never drive
 * the sort order.
 */
import type { ColumnDef } from "@tanstack/react-table";

import type { HospitalRecord } from "@/lib/types";
import {
  nullableNumericSort,
  nullableTextSort,
} from "@/lib/table/sorting";


function EmptyDash() {
  return <span className="text-ink-subtle text-xs">—</span>;
}

function textCell(value: string | null, { mono = false }: { mono?: boolean } = {}) {
  if (!value) return <EmptyDash />;
  return (
    <span className={`text-xs text-ink-muted ${mono ? "tabular" : ""}`}>
      {value}
    </span>
  );
}

export const HOSPITAL_COLUMNS: ColumnDef<HospitalRecord>[] = [
  {
    id: "name",
    header: "Hospital Name",
    size: 240,
    accessorFn: (row) => row.name,
    sortingFn: nullableTextSort,
    sortDescFirst: false,
    cell: ({ getValue }) => (
      <span className="truncate text-sm font-medium text-ink">
        {getValue() as string}
      </span>
    ),
  },
  {
    id: "canonicalHealthSystemName",
    header: "Health System",
    size: 200,
    accessorFn: (row) => row.canonicalHealthSystemName ?? row.canonicalHealthSystemDomain ?? (row.isSingleSite ? "Single-site facility" : "Unassigned"),
    sortingFn: nullableTextSort,
    sortDescFirst: false,
    cell: ({ getValue }) => {
      const value = getValue() as string | null;
      if (!value) return <EmptyDash />;
      return (
        <span className="truncate text-xs text-ink-muted">{value}</span>
      );
    },
  },
  {
    id: "canonicalHealthSystemDomain",
    header: "Health System Domain",
    size: 180,
    accessorFn: (row) => row.canonicalHealthSystemDomain,
    sortingFn: nullableTextSort,
    sortDescFirst: false,
    cell: ({ getValue }) => textCell(getValue() as string | null),
  },
  {
    id: "bedCount",
    header: "Bed Count",
    size: 100,
    accessorFn: (row) => row.bedCount,
    sortingFn: nullableNumericSort,
    sortDescFirst: true,
    cell: ({ row }) => {
      const value = row.original.bedCount;
      if (value == null) return <EmptyDash />;
      return (
        <span className="text-sm tabular text-ink">
          {value.toLocaleString("en-US")}
        </span>
      );
    },
  },
  {
    id: "cmsCcn",
    header: "CMS/CCN",
    size: 110,
    accessorFn: (row) => row.cmsCcn,
    sortingFn: nullableTextSort,
    sortDescFirst: false,
    cell: ({ getValue }) => textCell(getValue() as string | null, { mono: true }),
  },
  {
    id: "city",
    header: "City",
    size: 140,
    accessorFn: (row) => row.city,
    sortingFn: nullableTextSort,
    sortDescFirst: false,
    cell: ({ getValue }) => textCell(getValue() as string | null),
  },
  {
    id: "state",
    header: "State",
    size: 80,
    accessorFn: (row) => row.state,
    sortingFn: nullableTextSort,
    sortDescFirst: false,
    cell: ({ getValue }) => {
      const value = getValue() as string | null;
      if (!value) return <EmptyDash />;
      return (
        <span className="text-xs uppercase tabular text-ink-muted">
          {value}
        </span>
      );
    },
  },
  {
    id: "zip",
    header: "ZIP",
    size: 90,
    accessorFn: (row) => row.zip,
    sortingFn: nullableTextSort,
    sortDescFirst: false,
    cell: ({ getValue }) => textCell(getValue() as string | null, { mono: true }),
  },
];
