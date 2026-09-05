import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppNav } from "@/components/layout/AppNav";
import {
  NAV_ITEMS,
  PRIMARY_NAV_ITEM,
  SECONDARY_NAV_ITEMS,
  isNavItemActive,
} from "@/lib/navigation";

const pathname = vi.hoisted(() => ({ current: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

beforeEach(() => {
  pathname.current = "/";
});

describe("navigation model", () => {
  it("declares Hospitals as the primary destination at the root route", () => {
    expect(PRIMARY_NAV_ITEM.label).toBe("Hospitals");
    expect(PRIMARY_NAV_ITEM.href).toBe("/");
  });

  it("declares Health Systems as secondary destinations", () => {
    expect(SECONDARY_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Health Systems",
    ]);
    expect(SECONDARY_NAV_ITEMS.map((item) => item.href)).toEqual([
      "/health-systems",
    ]);
  });

  it("marks the root route active only for the exact root path", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/", "/imports")).toBe(false);
  });

  it("marks a secondary route active on the route and its children", () => {
    expect(isNavItemActive("/imports", "/imports")).toBe(true);
    expect(isNavItemActive("/imports", "/imports/42")).toBe(true);
    expect(isNavItemActive("/imports", "/health-systems")).toBe(false);
  });
});

describe("AppNav", () => {
  it("renders a link for every navigation destination", () => {
    render(<AppNav />);

    for (const item of NAV_ITEMS) {
      const link = screen.getByRole("link", { name: item.label });
      expect(link).toHaveAttribute("href", item.href);
    }
  });

  it("marks Hospitals as the current page on the default route", () => {
    render(<AppNav />);

    expect(screen.getByRole("link", { name: "Hospitals" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Health Systems" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("moves the current-page marker when another route is active", () => {
    pathname.current = "/health-systems";
    render(<AppNav />);

    expect(screen.getByRole("link", { name: "Health Systems" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Hospitals" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("keeps Hospitals visually primary and the others secondary", () => {
    pathname.current = "/health-systems";
    render(<AppNav />);

    expect(screen.getByRole("link", { name: "Hospitals" })).toHaveAttribute(
      "data-nav-emphasis",
      "primary",
    );
    for (const item of SECONDARY_NAV_ITEMS) {
      expect(screen.getByRole("link", { name: item.label })).toHaveAttribute(
        "data-nav-emphasis",
        "secondary",
      );
    }
  });

  it("exposes the navigation as a labelled landmark", () => {
    render(<AppNav />);

    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });
});
