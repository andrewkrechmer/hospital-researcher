"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  PRIMARY_NAV_ITEM,
  SECONDARY_NAV_ITEMS,
  isNavItemActive,
} from "@/lib/navigation";

function linkClasses(active: boolean, emphasis: "primary" | "secondary") {
  const base =
    "rounded-md px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

  if (active) {
    return `${base} bg-accent-soft text-accent font-semibold`;
  }

  return emphasis === "primary"
    ? `${base} text-ink font-semibold hover:bg-surface`
    : `${base} text-ink-muted font-medium hover:bg-surface hover:text-ink`;
}

export function AppNav() {
  const pathname = usePathname() ?? "/";
  const primaryActive = isNavItemActive(PRIMARY_NAV_ITEM.href, pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="flex items-center gap-6 px-5 py-3">
        <span className="text-[13px] font-semibold tracking-tight text-ink">
          Hospitals Prospecting Database
        </span>

        <nav aria-label="Main" className="flex items-center gap-1">
          <Link
            href={PRIMARY_NAV_ITEM.href}
            title={PRIMARY_NAV_ITEM.description}
            aria-current={primaryActive ? "page" : undefined}
            data-nav-emphasis="primary"
            className={linkClasses(primaryActive, "primary")}
          >
            {PRIMARY_NAV_ITEM.label}
          </Link>

          <span aria-hidden="true" className="mx-1 h-4 w-px bg-line" />

          {SECONDARY_NAV_ITEMS.map((item) => {
            const active = isNavItemActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.description}
                aria-current={active ? "page" : undefined}
                data-nav-emphasis="secondary"
                className={linkClasses(active, "secondary")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
