import { useState } from "react";
import { Brain, TrendingUp, TrendingDown, Minus, Globe, Landmark, Newspaper, ChevronDown, ChevronRight, BarChart3, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FredIndicator, TetlockScenario, TetlockWeightedForecast } from "@/lib/types";
import { useTetlockForecast } from "@/hooks/useApi";
import { TetlockForecastChart } from "@/components/TetlockForecastChart";

interface Props {
  indicators: FredIndicator[];
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "geopolitical":
      return <Globe className="w-4 h-4" />;
    case "monetary":
      return <Landmark className="w-4 h-4" />;
    case "trade":
    case "geoeconomic":
      return <BarChart3 className="w-4 h-4" />;
    default:
      return <Newspaper className="w-4 h-4" />;
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case "geopolitical":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "monetary":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "trade":
    case "geoeconomic":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "domestic":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    default:
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  }
}

function ProbabilityBar({ probability }: { probability: number }) {
  const pct = Math.round(probability * 100);
  const color = pct >= 50 ? "bg-emerald-500" : pct >= 25 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold tabular-nums min-w-[40px] text-right">{pct}%</span>
    </div>
  );
}

function ScenarioCard({ scenario, index }: { scenario: TetlockScenario; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button
        className="w-full p-4 text-left flex items-start gap-3 hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-shrink-0 mt-0.5">
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(scenario.category)}`}>
              {getCategoryIcon(scenario.category)}
              {scenario.category}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-foreground">{scenario.name}</h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scenario.description}</p>
          <div className="mt-2 w-full max-w-[200px]">
            <ProbabilityBar probability={scenario.probability} />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          <div>
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Reasoning</h5>
            <p className="text-sm text-foreground">{scenario.reasoning}</p>
          </div>

          <div>
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Economic Impacts</h5>
            <div className="space-y-2">
              {scenario.impacts.map((impact, i) => (
                <div key={i} className="flex items-start gap-2 bg-muted/50 rounded-md p-2.5">
                  <div className="flex-shrink-0 mt-0.5">
                    {impact.direction === "up" ? (
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    ) : impact.direction === "down" ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <Minus className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{impact.indicator}</span>
                      <span className={`text-xs font-bold ${
                        impact.direction === "up" ? "text-emerald-500" : impact.direction === "down" ? "text-red-500" : "text-muted-foreground"
                      }`}>
                        {impact.direction === "up" ? "+" : impact.direction === "down" ? "-" : ""}{impact.magnitude.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{impact.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Tetlock Pillars Applied</h5>
              <div className="flex flex-wrap gap-1">
                {scenario.tetlockPillars.map((p, i) => (
                  <span key={i} className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-md">{p}</span>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Commandments Used</h5>
              <div className="flex flex-wrap gap-1">
                {scenario.tetlockCommandments.map((c, i) => (
                  <span key={i} className="inline-block px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded-md">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WeightedForecastTable({ forecasts }: { forecasts: TetlockWeightedForecast[] }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Weighted Economic Forecasts
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Probability-weighted effects across all scenarios</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Indicator</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Current</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Forecast</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Change</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Confidence</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Equation</th>
            </tr>
          </thead>
          <tbody>
            {forecasts.map((f, i) => {
              const isPositive = f.weightedChange > 0;
              const isNegative = f.weightedChange < 0;
              return (
                <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{f.indicator}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{f.currentValue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{f.forecastValue.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${
                    isPositive ? "text-emerald-500" : isNegative ? "text-red-500" : "text-muted-foreground"
                  }`}>
                    {isPositive ? "+" : ""}{f.weightedChange.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {f.confidence >= 0.7 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : f.confidence >= 0.4 ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span className="font-mono text-xs">{Math.round(f.confidence * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground max-w-[300px] truncate" title={f.equation}>
                    {f.equation}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TetlockTab({ indicators }: Props) {
  const { forecast, loading, error, generate } = useTetlockForecast();

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Tetlock Superforecasting Analysis</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Uses Philip Tetlock's 10 Commandments and 7 Pillars of superforecasting to analyze current news,
                geopolitical climate, geo-economic conditions, and current events to produce probability-weighted economic forecasts.
              </p>
            </div>
          </div>
          <Button
            onClick={() => generate(indicators)}
            disabled={loading || indicators.length === 0}
            className="flex-shrink-0"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75" />
                  </svg>
                </span>
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Generate Forecast
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <div className="inline-flex items-center gap-3">
            <div className="animate-spin">
              <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Running Tetlock analysis...</p>
              <p className="text-xs text-muted-foreground">Analyzing geopolitical climate, current events, and economic conditions</p>
            </div>
          </div>
        </div>
      )}

      {forecast && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              icon={<Globe className="w-4 h-4" />}
              title="Geopolitical Climate"
              summary={forecast.geopoliticalSummary}
              color="text-red-500"
            />
            <SummaryCard
              icon={<Landmark className="w-4 h-4" />}
              title="Geo-Economic Climate"
              summary={forecast.geoeconomicSummary}
              color="text-blue-500"
            />
            <SummaryCard
              icon={<Newspaper className="w-4 h-4" />}
              title="Current Events"
              summary={forecast.currentEventsSummary}
              color="text-amber-500"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              Scenarios by Probability (Highest First)
            </h3>
            <div className="space-y-3">
              {[...forecast.scenarios]
                .sort((a, b) => b.probability - a.probability)
                .map((scenario, i) => (
                  <ScenarioCard key={i} scenario={scenario} index={i} />
                ))}
            </div>
          </div>

          <WeightedForecastTable forecasts={forecast.weightedForecasts} />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              Combined Projection: Historical + Normal Trend + Tetlock-Weighted Events
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Each chart shows actual historical data, the normal trend-based forecast (extrapolated with linear regression),
              and the Tetlock-weighted projection that layers scenario-probability-weighted event impacts on top of the trend.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {forecast.chartData
                .filter((s) => s.points.length > 0)
                .map((s) => (
                  <TetlockForecastChart key={s.seriesId} series={s} />
                ))}
            </div>
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Methodology</h4>
            <p className="text-sm text-foreground">{forecast.methodology}</p>
            <p className="text-xs text-muted-foreground mt-2">Analysis date: {forecast.analysisDate}</p>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, title, summary, color }: { icon: React.ReactNode; title: string; summary: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className={`flex items-center gap-2 mb-2 ${color}`}>
        {icon}
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
    </div>
  );
}
