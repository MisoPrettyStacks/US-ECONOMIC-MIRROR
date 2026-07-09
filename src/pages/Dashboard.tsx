import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { RefreshCw, Moon, Sun, Printer, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IndicatorCard } from "@/components/IndicatorCard";
import { WhatIfSlider } from "@/components/WhatIfSlider";
import { ForecastChart } from "@/components/ForecastChart";
import { TetlockTab } from "@/components/TetlockTab";
import { useTheme } from "@/hooks/useTheme";
import { useFredIndicators, useWhatIf } from "@/hooks/useApi";
import { getSliderRange, formatSliderValue } from "@/lib/format";

export default function Dashboard() {
  const { isDark, toggle } = useTheme();
  const { indicators, lastRefresh, loading, error, refetch } = useFredIndicators();
  const { forecasts, loading: whatIfLoading, calculate } = useWhatIf();
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const initializedRef = useRef(false);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const seriesMeta = useMemo(() => {
    const map: Record<string, { name: string; unit: string }> = {};
    indicators.forEach((ind) => {
      map[ind.seriesId] = { name: ind.name, unit: ind.unit };
    });
    return map;
  }, [indicators]);

  useEffect(() => {
    if (indicators.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      const vals: Record<string, number> = {};
      indicators.forEach((ind) => {
        vals[ind.seriesId] = ind.value;
      });
      setSliderValues(vals);
      calculate(
        indicators.map((ind) => ({ seriesId: ind.seriesId, value: ind.value })),
        seriesMeta,
      );
    }
  }, [indicators, calculate, seriesMeta]);

  const handleSliderChange = useCallback((seriesId: string, value: number) => {
    setSliderValues((prev) => ({ ...prev, [seriesId]: value }));
  }, []);

  const handleResetToLive = useCallback(() => {
    const vals: Record<string, number> = {};
    indicators.forEach((ind) => {
      vals[ind.seriesId] = ind.value;
    });
    setSliderValues(vals);
    calculate(
      indicators.map((ind) => ({ seriesId: ind.seriesId, value: ind.value })),
      seriesMeta,
    );
  }, [indicators, calculate, seriesMeta]);

  const debouncedCalculate = useCallback(() => {
    const adjustments = Object.entries(sliderValues).map(([seriesId, value]) => ({
      seriesId,
      value,
    }));
    calculate(adjustments, seriesMeta);
  }, [sliderValues, calculate, seriesMeta]);

  useEffect(() => {
    if (!initializedRef.current) return;
    const timer = setTimeout(debouncedCalculate, 500);
    return () => clearTimeout(timer);
  }, [sliderValues, debouncedCalculate]);

  const formatLastRefresh = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const topIndicators = indicators.filter((i) =>
    ["GDPC1", "UNRATE", "CPIAUCSL", "FEDFUNDS"].includes(i.seriesId)
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">U.S. Economic Mirror</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live control room for understanding the U.S. economy from Federal Reserve data
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">DATA SOURCE:</span>
              <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                FEDERAL RESERVE ECONOMIC DATA (FRED)
              </span>
            </div>
            {lastRefresh && (
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Last refresh: {formatLastRefresh(lastRefresh)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={toggle}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold text-foreground">Live mirror status</h2>
                <p className="text-sm text-muted-foreground">
                  All displayed economic values are fetched from live FRED series at request time.
                </p>
              </div>
            </div>
            <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-md">
              Live FRED data
            </span>
          </div>
          {loading && indicators.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-muted/50 rounded-lg h-32 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {topIndicators.map((ind) => (
                <IndicatorCard key={ind.seriesId} indicator={ind} />
              ))}
            </div>
          )}
        </div>

        <Tabs defaultValue="what-if">
          <TabsList>
            <TabsTrigger value="what-if">Live mirror and what-if</TabsTrigger>
            <TabsTrigger value="tetlock">Tetlock current-events forecast</TabsTrigger>
          </TabsList>

          <TabsContent value="what-if" className="mt-4 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3v18M3 12h18M7 7l10 10M17 7L7 17" />
                  </svg>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">What-if controls</h2>
                    <p className="text-sm text-muted-foreground">
                      Adjust live indicators and the model recalculates from FRED-derived historical relationships.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleResetToLive}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Reset to live
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {indicators.map((ind) => {
                  const range = getSliderRange(ind.seriesId, ind.value);
                  return (
                    <WhatIfSlider
                      key={ind.seriesId}
                      seriesId={ind.seriesId}
                      name={ind.name}
                      liveValue={ind.value}
                      currentValue={sliderValues[ind.seriesId] ?? ind.value}
                      min={range.min}
                      max={range.max}
                      step={range.step}
                      onChange={(v) => handleSliderChange(ind.seriesId, v)}
                    />
                  );
                })}
              </div>
            </div>

            {forecasts.length > 0 && (
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {forecasts.map((f) => (
                    <ForecastChart key={f.seriesId} forecast={f} />
                  ))}
                </div>
              </div>
            )}

            {whatIfLoading && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Recalculating forecasts...
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tetlock" className="mt-4">
            <TetlockTab indicators={indicators} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
