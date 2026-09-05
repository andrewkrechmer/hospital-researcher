/**
 * Reusable TanStack Table sorting functions and rank maps.
 *
 * These keep sorting logic (numeric vs lexical vs chronological, null/blank
 * handling, badge rank ordering) out of the column-definition components so
 * it can be unit-tested independently and shared by both views.
 */
import type { Row } from "@tanstack/react-table";

/**
 * Compare two possibly-null numbers. Nulls are treated as the smallest value
 * (sort first in ascending, last in descending). Because numeric columns
 * default to descending first, blanks end up at the bottom for the default
 * sort direction. The placement is deterministic, satisfying the contract's
 * "stable deterministic placement of equal and blank values" requirement.
 */
export function nullableNumericSort<T>(
  rowA: Row<T>,
  rowB: Row<T>,
  columnId: string,
): number {
  const a = rowA.getValue<number | null | undefined>(columnId);
  const b = rowB.getValue<number | null | undefined>(columnId);
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  return a - b;
}

/**
 * Compare two possibly-null strings lexically (case-insensitive). Nulls sort
 * last in ascending order.
 */
export function nullableTextSort<T>(
  rowA: Row<T>,
  rowB: Row<T>,
  columnId: string,
): number {
  const a = rowA.getValue<string | null | undefined>(columnId);
  const b = rowB.getValue<string | null | undefined>(columnId);
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/**
 * Compare two possibly-null ISO date strings chronologically. Nulls are
 * treated as the earliest value (sort first in ascending, last in descending),
 * so the default descending (newest first) sort keeps blanks at the bottom.
 */
export function nullableDateSort<T>(
  rowA: Row<T>,
  rowB: Row<T>,
  columnId: string,
): number {
  const a = rowA.getValue<string | null | undefined>(columnId);
  const b = rowB.getValue<string | null | undefined>(columnId);
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  const timeA = new Date(a).getTime();
  const timeB = new Date(b).getTime();
  if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
  if (Number.isNaN(timeA)) return -1;
  if (Number.isNaN(timeB)) return 1;
  return timeA - timeB;
}

/** Size tier → numeric rank for sorting. Higher tier = higher rank. */
export const SIZE_TIER_RANK: {
  Enterprise: number;
  Large: number;
  "Mid-Market": number;
  Small: number;
  [key: string]: number;
} = {
  Enterprise: 4,
  Large: 3,
  "Mid-Market": 2,
  Small: 1,
};

/** Confidence level → numeric rank for sorting. Higher confidence = higher rank. */
export const CONFIDENCE_RANK: {
  high: number;
  medium: number;
  low: number;
  unknown: number;
  [key: string]: number;
} = {
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

/**
 * Compare two rank values (e.g. size tier or confidence rank). Null/unknown
 * ranks sort last in ascending order. The accessor is expected to return the
 * numeric rank (or null).
 */
export function rankSort<T>(
  rowA: Row<T>,
  rowB: Row<T>,
  columnId: string,
): number {
  const a = rowA.getValue<number | null | undefined>(columnId);
  const b = rowB.getValue<number | null | undefined>(columnId);
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}
