import { Slider } from "@/components/ui/slider";
import { formatSliderValue } from "@/lib/format";
import type { CorrelationDriver } from "@/lib/types";

interface Props {
  seriesId: string;
  name: string;
  liveValue: number;
  currentValue: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  // True when this slider hasn't been dragged directly - its position is
  // being driven by a data-driven correlation with a slider that was moved.
  isCorrelated?: boolean;
  topDriver?: CorrelationDriver | null;
}

export function WhatIfSlider({
  seriesId,
  name,
  liveValue,
  currentValue,
  min,
  max,
  step,
  onChange,
  isCorrelated = false,
  topDriver = null,
}: Props) {
  return (
    <div
      className="bg-card border rounded-lg p-4 transition-colors"
      style={
        isCorrelated
          ? { borderColor: "hsl(var(--chart-3) / 0.5)", backgroundColor: "hsl(var(--chart-3) / 0.04)" }
          : undefined
      }
    >
      <div className="flex justify-between items-start mb-1">
        <div>
          <h4 className="text-sm font-medium text-foreground">{name}</h4>
          <p className="text-xs text-muted-foreground">Live: {formatSliderValue(liveValue, seriesId)}</p>
        </div>
        <span className="text-sm font-mono font-medium text-foreground">
          {formatSliderValue(currentValue, seriesId)}
        </span>
      </div>
      <div className="mt-3">
        <Slider
          value={[currentValue]}
          onValueChange={(vals) => onChange(vals[0])}
          min={min}
          max={max}
          step={step}
          className="w-full"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">{formatSliderValue(min, seriesId)}</span>
          <span className="text-xs text-muted-foreground">{formatSliderValue(max, seriesId)}</span>
        </div>
      </div>
      {isCorrelated && topDriver && (
        <p
          className="text-[11px] font-mono mt-2 pt-2 border-t border-border/60"
          style={{ color: "hsl(var(--chart-3))" }}
        >
          Auto-adjusted - r={topDriver.correlation.toFixed(2)} vs {topDriver.seriesId}
        </p>
      )}
    </div>
  );
}
