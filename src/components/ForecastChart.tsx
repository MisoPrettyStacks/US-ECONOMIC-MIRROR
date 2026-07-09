import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { WhatIfForecast } from "@/lib/types";

interface Props {
  forecast: WhatIfForecast;
}

export function ForecastChart({ forecast }: Props) {
  const data = forecast.points.map((p) => ({
    date: p.date,
    value: p.value,
    type: p.type,
    historical: p.type === "historical" ? p.value : undefined,
    forecast: p.type === "forecast" ? p.value : undefined,
    correlated: p.type === "forecast" ? p.correlated : undefined,
  }));

  if (data.length > 0) {
    const lastHistIdx = data.findLastIndex((d) => d.type === "historical");
    if (lastHistIdx >= 0 && lastHistIdx < data.length - 1) {
      data[lastHistIdx + 1] = {
        ...data[lastHistIdx + 1],
        historical: data[lastHistIdx].value,
      };
    }
  }

  // The correlated overlay only earns its own line when it actually
  // diverges from the own-slider forecast - otherwise it's just visual
  // noise sitting on top of an identical line.
  const hasCorrelatedDivergence = data.some(
    (d) => d.correlated !== undefined && d.forecast !== undefined && Math.abs(d.correlated - d.forecast) > 1e-6,
  );

  const values = data.flatMap((d) => [d.value, d.correlated]).filter((v): v is number => v !== undefined);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padding = (maxVal - minVal) * 0.1 || 1;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{forecast.name}</h3>
          <p className="text-xs text-muted-foreground">{forecast.unit}</p>
        </div>
        {hasCorrelatedDivergence && forecast.topDriver && (
          <span
            className="shrink-0 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border"
            style={{
              color: "hsl(var(--chart-3))",
              borderColor: "hsl(var(--chart-3) / 0.4)",
              backgroundColor: "hsl(var(--chart-3) / 0.1)",
            }}
            title="Data-driven Pearson correlation coefficient (r), computed from month-over-month historical changes"
          >
            r={forecast.topDriver.correlation.toFixed(2)} vs {forecast.topDriver.seriesId}
          </span>
        )}
      </div>
      <div className="h-[250px] mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => {
                const d = new Date(v);
                return d.getFullYear().toString();
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minVal - padding, maxVal + padding]}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => {
                if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;
                if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                return v.toFixed(1);
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [value.toLocaleString(), ""]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="historical"
              name="Historical"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Forecast"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls={false}
            />
            {hasCorrelatedDivergence && (
              <Line
                type="monotone"
                dataKey="correlated"
                name="Correlated impact"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
