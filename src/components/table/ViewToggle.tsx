"use client";

/**
 * Segmented control for switching between Health System View and Hospital
 * View. The toggle is fully reversible without page navigation: it only
 * changes which table the parent renders. Keyboard accessible (native
 * buttons) with a visible active state and `aria-pressed`.
 */

export type TableView = "health-system" | "hospital";

interface ViewToggleProps {
  view: TableView;
  onChange: (view: TableView) => void;
}

const OPTIONS: { value: TableView; label: string }[] = [
  { value: "health-system", label: "Health System View" },
  { value: "hospital", label: "Hospital View" },
];

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Table view"
      className="inline-flex items-center rounded-md border border-line bg-surface p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = option.value === view;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
              active
                ? "bg-canvas text-ink shadow-sm border border-line"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
