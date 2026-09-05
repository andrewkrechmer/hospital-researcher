/**
 * Application navigation model.
 *
 * `primary` is the default destination the app opens on; `secondary` items are
 * supporting destinations that must stay reachable without displacing the
 * primary one.
 */
export interface NavItem {
  /** Visible link label. */
  label: string;
  /** App Router path. */
  href: string;
  /** Short description used for accessible titles. */
  description: string;
}

export const PRIMARY_NAV_ITEM: NavItem = {
  label: "Hospitals",
  href: "/",
  description: "Browse hospitals and their health-system relationships",
};

export const SECONDARY_NAV_ITEMS: readonly NavItem[] = [
  {
    label: "Health Systems",
    href: "/health-systems",
    description: "Browse health systems and their aggregate metrics",
  },
];

export const NAV_ITEMS: readonly NavItem[] = [
  PRIMARY_NAV_ITEM,
  ...SECONDARY_NAV_ITEMS,
];

/**
 * Returns true when `href` is the active destination for the given pathname.
 * The primary item ("/") matches only the exact root path so it does not stay
 * highlighted on every nested route.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
