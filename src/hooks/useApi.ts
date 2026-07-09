import { useState, useCallback, useEffect } from "react";
import type { FredIndicator, WhatIfForecast, TetlockForecastResponse } from "@/lib/types";
import { computeCorrelationMatrix, type CorrelationMatrix } from "@/lib/correlations";

const DATA_BASE = `${import.meta.env.BASE_URL}data`;

type HistoryPoint = { date: string; value: number };
type HistoryMap = Record<string, HistoryPoint[]>;

let historyCache: HistoryMap | null = null;
let correlationCache: CorrelationMatrix | null = null;

async function loadHistory(): Promise<HistoryMap> {
  if (historyCache) return historyCache;
  const res = await fetch(`${DATA_BASE}/history.json`);
  if (!res.ok) throw new Error("Failed to load history data");
  historyCache = await res.json();
  return historyCache!;
}

// Correlation matrix is derived purely from history.json, so it only ever
// needs to be computed once per page load.
function getCorrelationMatrix(history: HistoryMap): CorrelationMatrix {
  if (!correlationCache) correlationCache = computeCorrelationMatrix(history);
  return correlationCache;
}

// How strongly a shock on one slider bleeds into a correlated series'
// projection. 1.0 would mean "fully trust the historical correlation";
// keeping this below 1 avoids compounding noise into wild swings.
const CROSS_SERIES_INFLUENCE = 0.6;
// Ignore correlations too weak to be a meaningful, data-driven signal.
const MIN_MEANINGFUL_CORRELATION = 0.15;

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

  const calculate = useCallback(
    async (
      adjustments: { seriesId: string; value: number }[],
      meta?: Record<string, { name: string; unit: string }>,
    ) => {
      setLoading(true);
      try {
        const history = await loadHistory();
        const correlations = getCorrelationMatrix(history);
        const adjustmentMap = new Map(adjustments.map((a) => [a.seriesId, a.value]));

        // Step 1: figure out each series' own "shock" - how far its slider
        // has been dragged from its last live/historical reading, as a
        // fraction. A slider left untouched has a shock of 0.
        const ownShocks: Record<string, number> = {};
        for (const [seriesId, points] of Object.entries(history)) {
          if (points.length === 0) continue;
          const lastHistorical = points[points.length - 1].value;
          const currentValue = adjustmentMap.get(seriesId);
          ownShocks[seriesId] =
            currentValue === undefined || lastHistorical === 0
              ? 0
              : (currentValue - lastHistorical) / lastHistorical;
        }
        const movedSeriesIds = Object.entries(ownShocks)
          .filter(([, shock]) => Math.abs(shock) > 1e-9)
          .map(([id]) => id);

        const results: WhatIfForecast[] = Object.entries(history).map(([seriesId, points]) => {
          const historicalPoints: {
            date: string;
            value: number;
            type: "historical" | "forecast";
            correlated?: number;
          }[] = points.map((p) => ({ ...p, type: "historical" as const }));

          const ownShock = ownShocks[seriesId] ?? 0;

          // Step 2: blend in every OTHER moved slider's shock, weighted by
          // its data-driven correlation with this series. This is what
          // makes every graph react - not just the one whose slider moved.
          let correlatedShock = ownShock;
          let topDriver: { seriesId: string; correlation: number } | null = null;
          for (const otherId of movedSeriesIds) {
            if (otherId === seriesId) continue;
            const corr = correlations[seriesId]?.[otherId] ?? 0;
            if (Math.abs(corr) < MIN_MEANINGFUL_CORRELATION) continue;
            correlatedShock += corr * ownShocks[otherId] * CROSS_SERIES_INFLUENCE;
            if (!topDriver || Math.abs(corr) > Math.abs(topDriver.correlation)) {
              topDriver = { seriesId: otherId, correlation: corr };
            }
          }
          // Clamp so a chain of strong correlations can't blow up the chart.
          correlatedShock = Math.max(-0.9, Math.min(3, correlatedShock));

          if (historicalPoints.length > 0) {
            const lastPoint = historicalPoints[historicalPoints.length - 1];
            const lastDate = new Date(lastPoint.date);
            const lastHistorical = lastPoint.value;

            for (let i = 1; i <= 8; i++) {
              const futureDate = new Date(lastDate);
              futureDate.setMonth(futureDate.getMonth() + i * 3);
              const decay = 1 - i * 0.08;
              const trend = lastHistorical * (1 + ownShock * decay);
              const correlatedTrend = lastHistorical * (1 + correlatedShock * decay);
              historicalPoints.push({
                date: futureDate.toISOString().split("T")[0],
                value: Math.round(trend * 100) / 100,
                type: "forecast",
                correlated: Math.round(correlatedTrend * 100) / 100,
              });
            }
          }

          const info = meta?.[seriesId];
          const lastHistorical = points.length > 0 ? points[points.length - 1].value : 0;
          return {
            seriesId,
            name: info?.name ?? seriesId,
            unit: info?.unit ?? "",
            points: historicalPoints,
            baselineValue: lastHistorical,
            correlatedShock,
            topDriver,
          };
        });

        setForecasts(results);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    [],
  );

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
