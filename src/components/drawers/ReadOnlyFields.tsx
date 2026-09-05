import type { ReactNode } from "react";

export function ReadOnlyFields({ fields }: { fields: [string, ReactNode][] }) {
  return <dl className="grid grid-cols-2 gap-x-5 gap-y-4">{fields.map(([label, value]) => (
    <div key={label} className="min-w-0">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink">{value === null || value === undefined || value === "" ? "—" : value}</dd>
    </div>
  ))}</dl>;
}

export function DetailError({ retry }: { retry: () => void }) {
  return <div role="alert" className="text-sm text-ink-muted">Unable to load details.
    <button type="button" onClick={retry} className="ml-2 text-accent underline">Retry</button>
  </div>;
}
