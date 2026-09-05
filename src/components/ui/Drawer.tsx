"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
} from "react";

/**
 * Reusable side drawer (slides in from the right). The table stays mounted
 * underneath so opening a drawer never navigates away or loses table state.
 *
 * Accessibility (VAL-DRAWER-041):
 *  - `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
 *  - Focus moves to the drawer panel on open and returns to the trigger on close
 *  - Escape closes; backdrop click closes
 *  - A simple focus trap keeps Tab within the drawer while open
 *
 * Long content scrolls inside the body; the header (with close button) stays
 * pinned so controls are always reachable (VAL-DRAWER-037).
 */
interface DrawerProps {
  /** Whether the drawer is open. */
  open: boolean;
  /** Called when the drawer requests to close (Escape, backdrop, close button). */
  onClose: () => void;
  /** Accessible label for the drawer (used by aria-labelledby). */
  title: string;
  /** Rendered in the pinned header next to the close button. */
  headerExtra?: ReactNode;
  /** Scrollable body content. */
  children: ReactNode;
}

export function Drawer({
  open,
  onClose,
  title,
  headerExtra,
  children,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const headingId = useId();

  // Focus management: on open, save the trigger and move focus to the panel;
  // on close, restore focus to the trigger.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Move focus to the close button (first control) so keyboard users land
    // inside the drawer.
    const t = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(t);
      // Restore focus to the element that opened the drawer.
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Simple focus trap: keep Tab within the panel.
  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onKeyDown={handleKeyDown}
        className="relative flex h-full w-full max-w-md flex-col bg-canvas shadow-xl sm:max-w-lg"
      >
        {/* Pinned header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="min-w-0">
            <h2
              id={headingId}
              className="truncate text-base font-semibold text-ink"
            >
              {title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerExtra}
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
