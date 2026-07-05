import { Slider } from "@/components/ui/slider";
import { formatSliderValue } from "@/lib/format";

interface Props {
  seriesId: string;
  name: string;
  liveValue: number;
  currentValue: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

export function WhatIfSlider({ seriesId, name, liveValue, currentValue, min, max, step, onChange }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
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
    </div>
  );
}
