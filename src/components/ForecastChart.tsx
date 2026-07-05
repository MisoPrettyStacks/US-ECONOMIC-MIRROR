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

  const values = data.map((d) => d.value).filter(Boolean);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padding = (maxVal - minVal) * 0.1 || 1;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="mb-1">
        <h3 className="text-sm font-semibold text-foreground">{forecast.name}</h3>
        <p className="text-xs text-muted-foreground">{forecast.unit}</p>
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
