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
import type { TetlockChartSeries } from "@/lib/types";

interface Props {
  series: TetlockChartSeries;
}

export function TetlockForecastChart({ series }: Props) {
  const data = series.points.map((p) => ({
    date: p.date,
    value: p.value,
    type: p.type,
    historical: p.type === "historical" ? p.value : undefined,
    trend: p.type === "trend" ? p.value : undefined,
    tetlock: p.type === "tetlock" ? p.value : undefined,
  }));

  if (data.length > 0) {
    const lastHistIdx = data.findLastIndex((d) => d.type === "historical");
    if (lastHistIdx >= 0 && lastHistIdx < data.length - 1) {
      const nextTrendIdx = data.findIndex((d, i) => i > lastHistIdx && d.type === "trend");
      const nextTetlockIdx = data.findIndex((d, i) => i > lastHistIdx && d.type === "tetlock");
      if (nextTrendIdx >= 0) data[nextTrendIdx] = { ...data[nextTrendIdx], trend: data[lastHistIdx].value };
      if (nextTetlockIdx >= 0) data[nextTetlockIdx] = { ...data[nextTetlockIdx], tetlock: data[lastHistIdx].value };
    }
  }

  const values = data.map((d) => d.value).filter((v) => v !== undefined && !Number.isNaN(v));
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 1;
  const padding = (maxVal - minVal) * 0.1 || 1;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="mb-1">
        <h3 className="text-sm font-semibold text-foreground">{series.name}</h3>
        <p className="text-xs text-muted-foreground">{series.unit}</p>
      </div>
      <div className="h-[250px] mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => new Date(v).getFullYear().toString()}
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
              formatter={(value: number) => [value?.toLocaleString(), ""]}
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
              dataKey="trend"
              name="Normal Trend"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="tetlock"
              name="Tetlock-Weighted Projection"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2.5}
              strokeDasharray="5 3"
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
