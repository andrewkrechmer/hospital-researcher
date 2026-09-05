"use client";

import { createContext, useContext } from "react";

/** Options when opening the hospital drawer from a row action. */
export interface OpenHospitalDrawerOptions {
  /** Focus/scroll to the claims section (conflict indicator click). */
  focusClaims?: boolean;
}

/**
 * Context providing row-level actions to column cell renderers. Column
 * definitions are static module-level arrays, so a context is the cleanest way
 * to give cells access to the open-hospital-drawer handler without converting
 * every column definition into a factory.
 */
export interface RowActionContextValue {
  openHospitalDrawer: (
    hospitalId: string,
    options?: OpenHospitalDrawerOptions,
  ) => void;
}

const noop = () => {};

const RowActionContext = createContext<RowActionContextValue>({
  openHospitalDrawer: noop,
});

export const RowActionProvider = RowActionContext.Provider;

/** Hook used by column cells to open the hospital drawer. */
export function useRowActions(): RowActionContextValue {
  return useContext(RowActionContext);
}
