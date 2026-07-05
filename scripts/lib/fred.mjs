const FRED_API_KEY = process.env.FRED_API_KEY;
const FRED_BASE_URL = "https://api.stlouisfed.org/fred";

export const INDICATOR_SERIES = [
  { seriesId: "GDPC1", name: "Real GDP", unit: "Billions of Chained 2017 Dollars", category: "Output" },
  { seriesId: "UNRATE", name: "Unemployment Rate", unit: "Percent", category: "Labor" },
  { seriesId: "CPIAUCSL", name: "Inflation Rate", unit: "Index 1982-1984=100", category: "Prices" },
  { seriesId: "FEDFUNDS", name: "Federal Funds Rate", unit: "Percent", category: "Monetary Policy" },
  { seriesId: "DGS10", name: "10-Year Treasury Yield", unit: "Percent", category: "Interest Rates" },
  { seriesId: "GFDEBTN", name: "Federal Debt", unit: "Millions of Dollars", category: "Fiscal" },
  { seriesId: "BOPGSTB", name: "Goods and Services Trade Balance", unit: "Millions of Dollars", category: "Trade" },
  { seriesId: "INDPRO", name: "Industrial Production", unit: "Index 2017=100", category: "Production" },
  { seriesId: "RSAFS", name: "Retail Sales", unit: "Millions of Dollars", category: "Consumer" },
  { seriesId: "HOUST", name: "Housing Starts", unit: "Thousands of Units", category: "Housing" },
  { seriesId: "PAYEMS", name: "Nonfarm Payrolls", unit: "Thousands of Persons", category: "Employment" },
];

export async function fetchFredSeries(seriesId, limit = 2) {
  if (!FRED_API_KEY) throw new Error("FRED_API_KEY not configured");
  const url = `${FRED_BASE_URL}/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED API error: ${res.status}`);
  const data = await res.json();
  return data.observations || [];
}

export async function fetchFredHistory(seriesId, startDate, endDate) {
  if (!FRED_API_KEY) throw new Error("FRED_API_KEY not configured");
  let url = `${FRED_BASE_URL}/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc`;
  if (startDate) url += `&observation_start=${startDate}`;
  if (endDate) url += `&observation_end=${endDate}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED API error: ${res.status}`);
  const data = await res.json();
  return (data.observations || []).filter((o) => o.value !== ".");
}

export function computeYoYSeries(obs) {
  const parsed = obs.map((o) => ({ date: o.date, value: parseFloat(o.value) }));
  const result = [];
  for (let i = 0; i < parsed.length; i++) {
    const current = parsed[i];
    const currentDate = new Date(current.date);
    const yearAgo = parsed.find((o) => {
      const oDate = new Date(o.date);
      const monthsDiff = (currentDate.getFullYear() - oDate.getFullYear()) * 12 + (currentDate.getMonth() - oDate.getMonth());
      return monthsDiff >= 11 && monthsDiff <= 13;
    });
    if (yearAgo && yearAgo.value !== 0) {
      result.push({
        date: current.date,
        value: Math.round(((current.value - yearAgo.value) / yearAgo.value) * 10000) / 100,
      });
    }
  }
  return result;
}

export function linearTrendForecast(points, periods, periodMonths) {
  if (points.length < 2) return [];
  const recent = points.slice(-20);
  const n = recent.length;
  const xs = recent.map((_, i) => i);
  const ys = recent.map((p) => p.value);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const lastDate = new Date(recent[recent.length - 1].date);
  const forecast = [];
  for (let i = 1; i <= periods; i++) {
    const x = n - 1 + i;
    const value = intercept + slope * x;
    const futureDate = new Date(lastDate);
    futureDate.setMonth(futureDate.getMonth() + i * periodMonths);
    forecast.push({ date: futureDate.toISOString().split("T")[0], value: Math.round(value * 100) / 100 });
  }
  return forecast;
}
