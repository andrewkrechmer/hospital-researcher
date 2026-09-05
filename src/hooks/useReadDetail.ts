"use client";
import { useEffect, useState } from "react";

export function useReadDetail<T>(url: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data: T | null; error: boolean } | null>(null);
  const key = `${url}:${attempt}`;
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load details");
        return response.json() as Promise<T>;
      })
      .then((data) => { if (!controller.signal.aborted) setResult({ key, data, error: false }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ key, data: null, error: true }); });
    return () => controller.abort();
  }, [url, key]);
  return {
    data: result?.key === key ? result.data : null,
    error: result?.key === key && result.error,
    retry: () => setAttempt((value) => value + 1),
  };
}
