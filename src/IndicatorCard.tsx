import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { FredIndicator } from "@/lib/types";
import { formatValue } from "@/lib/format";

interface Props {
  indicator: FredIndicator;
}

export function IndicatorCard({ indicator }: Props) {
  const isPositive = indicator.percentChange > 0;
  const isNegative = indicator.percentChange < 0;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-sm font-medium text-muted-foreground">{indicator.name}</h3>
        <span className="text-xs font-medium text-muted-foreground">{indicator.category}</span>
      </div>
      <div className="text-2xl font-bold text-primary mt-1">
        {formatValue(indicator.value, indicator.seriesId)}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        {isPositive ? (
          <TrendingUp className="w-4 h-4 text-emerald-500" />
        ) : isNegative ? (
          <TrendingDown className="w-4 h-4 text-red-500" />
        ) : (
          <Minus className="w-4 h-4 text-muted-foreground" />
        )}
        <span
          className={`text-sm font-medium ${
            isPositive ? "text-emerald-500" : isNegative ? "text-red-500" : "text-muted-foreground"
          }`}
        >
          {isPositive ? "+" : ""}
          {indicator.percentChange.toFixed(2)}%
        </span>
        <span className="text-xs text-muted-foreground">latest FRED change</span>
      </div>
      <div className="text-xs font-mono text-muted-foreground mt-2">
        {indicator.seriesId} · {indicator.date}
      </div>
    </div>
  );
}
