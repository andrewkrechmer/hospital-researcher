/**
 * Compact pill/badge used for facility types, size tiers, confidence levels,
 * relationship types, and conflict indicators throughout the table.
 */

type BadgeVariant =
  | "neutral"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "purple"
  | "gray";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-surface text-ink-muted border-line",
  blue: "bg-accent-soft text-accent border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  gray: "bg-gray-100 text-gray-600 border-gray-200",
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  title?: string;
  className?: string;
}

export function Badge({ label, variant = "neutral", title, className = "" }: BadgeProps) {
  return (
    <span
      title={title ?? label}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium leading-none whitespace-nowrap ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {label}
    </span>
  );
}

/** Size tier → badge variant mapping for consistent styling. */
export function SizeTierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-ink-subtle text-xs">—</span>;
  const variant: BadgeVariant =
    tier === "Enterprise" ? "purple"
    : tier === "Large" ? "blue"
    : tier === "Mid-Market" ? "green"
    : "gray";
  return <Badge label={tier} variant={variant} />;
}

/** Confidence level → badge with consistent color semantics. */
export function ConfidenceBadge({ level }: { level: string | null }) {
  const normalized = (level ?? "").trim().toLowerCase();
  if (!normalized || normalized === "unknown") {
    return <span className="text-ink-subtle text-xs">Unknown</span>;
  }
  const variant: BadgeVariant =
    normalized === "high" ? "green"
    : normalized === "medium" ? "amber"
    : "red";
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return <Badge label={label} variant={variant} title={`${label} confidence`} />;
}

/** Facility type → badge with consistent styling. */
export function FacilityTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-ink-subtle text-xs">—</span>;
  return <Badge label={type} variant="blue" />;
}

/** Conflict indicator badge. */
export function ConflictBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge
      label={`⚠ ${count} conflict${count > 1 ? "s" : ""}`}
      variant="red"
      title={`${count} conflicting claim${count > 1 ? "s" : ""}`}
    />
  );
}

/** Relationship type → badge. */
export function RelationshipBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const label = type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge label={label} variant="neutral" />;
}
