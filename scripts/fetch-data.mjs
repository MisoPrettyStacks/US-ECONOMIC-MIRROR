import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { INDICATOR_SERIES, fetchFredSeries, fetchFredHistory, computeYoYSeries } from "./lib/fred.mjs";

const OUT_DIR = path.resolve(import.meta.dirname, "..", "public", "data");

async function buildIndicators() {
  const indicators = [];
  for (const series of INDICATOR_SERIES) {
    let value;
    let date;
    let previousValue;
    if (series.seriesId === "CPIAUCSL") {
      const obs = await fetchFredHistory(
        series.seriesId,
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 400).toISOString().split("T")[0],
      );
      const yoy = computeYoYSeries(obs);
      value = yoy[yoy.length - 1]?.value ?? 0;
      previousValue = yoy[yoy.length - 2]?.value;
      date = yoy[yoy.length - 1]?.date ?? "";
    } else {
      const obs = await fetchFredSeries(series.seriesId, 2);
      value = obs[0] ? parseFloat(obs[0].value) : 0;
      previousValue = obs[1] ? parseFloat(obs[1].value) : undefined;
      date = obs[0]?.date ?? "";
    }
    indicators.push({
      seriesId: series.seriesId,
      name: series.name,
      unit: series.unit,
      category: series.category,
      value,
      previousValue,
      date,
    });
  }
  return indicators;
}

async function buildHistory() {
  const history = {};
  const startDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 10).toISOString().split("T")[0];
  for (const series of INDICATOR_SERIES) {
    const obs = await fetchFredHistory(series.seriesId, startDate);
    if (series.seriesId === "CPIAUCSL") {
      history[series.seriesId] = computeYoYSeries(obs);
    } else {
      history[series.seriesId] = obs.map((o) => ({ date: o.date, value: parseFloat(o.value) }));
    }
  }
  return history;
}

async function main() {
  console.log("Fetching live FRED indicators...");
  const indicators = await buildIndicators();
  console.log("Fetching 10-year history for all indicators...");
  const history = await buildHistory();

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    path.join(OUT_DIR, "indicators.json"),
    JSON.stringify({ indicators, lastRefresh: new Date().toISOString() }, null, 2),
  );
  await writeFile(path.join(OUT_DIR, "history.json"), JSON.stringify(history, null, 2));

  console.log(`Wrote ${indicators.length} indicators and history to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("fetch-data failed:", err);
  process.exit(1);
});
