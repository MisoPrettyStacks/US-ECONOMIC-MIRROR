import { useState, useCallback, useEffect } from "react";
import type { FredIndicator, WhatIfForecast, TetlockForecastResponse } from "@/lib/types";

const DATA_BASE = `${import.meta.env.BASE_URL}data`;

type HistoryPoint = { date: string; value: number };
type HistoryMap = Record<string, HistoryPoint[]>;

let historyCache: HistoryMap | null = null;

async function loadHistory(): Promise<HistoryMap> {
  if (historyCache) return historyCache;
  const res = await fetch(`${DATA_BASE}/history.json`);
  if (!res.ok) throw new Error("Failed to load history data");
  historyCache = await res.json();
  return historyCache!;
}

export function useFredIndicators() {
  const [indicators, setIndicators] = useState<FredIndicator[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${DATA_BASE}/indicators.json`);
      if (!res.ok) throw new Error("Failed to fetch indicators");
      const data = await res.json();
      setIndicators(data.indicators);
      setLastRefresh(data.lastRefresh);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { indicators, lastRefresh, loading, error, refetch: fetch_ };
}

// Ported from the live app's server-side what-if calculation, run entirely
// client-side against the pre-fetched 10-year history bundle so it works on
// static hosting (GitHub Pages) with no backend.
export function useWhatIf() {
  const [forecasts, setForecasts] = useState<WhatIfForecast[]>([]);
  const [loading, setLoading] = useState(false);

  const calculate = useCallback(async (adjustments: { seriesId: string; value: number }[]) => {
    setLoading(true);
    try {
      const history = await loadHistory();
      const adjustmentMap = new Map(adjustments.map((a) => [a.seriesId, a.value]));

      const results: WhatIfForecast[] = Object.entries(history).map(([seriesId, points]) => {
        const historicalPoints: { date: string; value: number; type: "historical" | "forecast" }[] = points.map(
          (p) => ({ ...p, type: "historical" as const }),
        );

        const currentValue = adjustmentMap.get(seriesId);
        if (currentValue !== undefined && historicalPoints.length > 0) {
          const lastPoint = historicalPoints[historicalPoints.length - 1];
          const lastDate = new Date(lastPoint.date);
          const lastHistorical = lastPoint.value;
          const ratio = lastHistorical === 0 ? 1 : currentValue / lastHistorical;

          for (let i = 1; i <= 8; i++) {
            const futureDate = new Date(lastDate);
            futureDate.setMonth(futureDate.getMonth() + i * 3);
            const trend = lastHistorical * (1 + (ratio - 1) * (1 - i * 0.08));
            historicalPoints.push({
              date: futureDate.toISOString().split("T")[0],
              value: Math.round(trend * 100) / 100,
              type: "forecast",
            });
          }
        }

        return { seriesId, name: seriesId, unit: "", points: historicalPoints };
      });

      setForecasts(results);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  return { forecasts, loading, calculate };
}

export function useTetlockForecast() {
  const [forecast, setForecast] = useState<TetlockForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (_indicators: FredIndicator[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${DATA_BASE}/tetlock-forecast.json`);
      if (!res.ok) throw new Error("No forecast available yet - it is generated on a schedule by GitHub Actions");
      const data = await res.json();
      setForecast(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { forecast, loading, error, generate };
}

export function useLastUpdated() {
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${DATA_BASE}/indicators.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUpdatedAt(d.lastRefresh))
      .catch(() => {});
  }, []);

  return updatedAt;
}
