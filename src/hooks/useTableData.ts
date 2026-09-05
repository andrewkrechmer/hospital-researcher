"use client";

import { useCallback, useEffect, useState } from "react";

import type { HealthSystemRecord, HospitalRecord } from "@/lib/types";

interface TableDataState {
  hospitals: HospitalRecord[];
  healthSystems: HealthSystemRecord[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches all hospitals and health systems once on mount. The full dataset is
 * kept in state so all client-side interactions (expand/collapse, sort) are
 * instant with no network round-trips.
 */
export function useTableData() {
  const [state, setState] = useState<TableDataState>({
    hospitals: [],
    healthSystems: [],
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [hospitalsRes, systemsRes] = await Promise.all([
        fetch("/api/hospitals"),
        fetch("/api/health-systems"),
      ]);

      if (!hospitalsRes.ok || !systemsRes.ok) {
        throw new Error("Failed to load data");
      }

      const hospitalsData = await hospitalsRes.json();
      const systemsData = await systemsRes.json();

      setState({
        hospitals: hospitalsData.hospitals ?? [],
        healthSystems: systemsData.healthSystems ?? [],
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "An unexpected error occurred",
      }));
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { ...state, retry: fetchData };
}
