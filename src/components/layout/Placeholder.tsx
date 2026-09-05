interface PlaceholderProps {
  title: string;
  body: string;
}

/**
 * Neutral panel shown by routes whose content is not built yet. Keeps the shell
 * and navigation verifiable without pretending data exists.
 */
export function Placeholder({ title, body }: PlaceholderProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md rounded-lg border border-line bg-surface px-6 py-5 text-center">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
      </div>
    </div>
  );
}
