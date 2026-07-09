import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { INDICATOR_SERIES, fetchFredHistory, computeYoYSeries, linearTrendForecast } from "./lib/fred.mjs";

const OUT_DIR = path.resolve(import.meta.dirname, "..", "public", "data");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function buildChartData(weightedForecasts) {
  const forecastByName = new Map();
  for (const wf of weightedForecasts || []) {
    if (wf?.indicator) forecastByName.set(normalizeName(wf.indicator), wf);
  }

  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 5);

  return Promise.all(
    INDICATOR_SERIES.map(async (series) => {
      try {
        const rawObs = await fetchFredHistory(series.seriesId, startDate.toISOString().split("T")[0]);
        const historyPoints =
          series.seriesId === "CPIAUCSL"
            ? computeYoYSeries(rawObs)
            : rawObs.map((o) => ({ date: o.date, value: parseFloat(o.value) }));

        if (historyPoints.length === 0) {
          return { seriesId: series.seriesId, name: series.name, unit: series.unit, points: [] };
        }

        const points = historyPoints.map((p) => ({ ...p, type: "historical" }));

        const trendForecast = linearTrendForecast(historyPoints, 8, 3);
        const matchedForecast = forecastByName.get(normalizeName(series.name));
        const weightedChangePct = matchedForecast ? (matchedForecast.weightedChange || 0) / 100 : 0;

        trendForecast.forEach((p, i) => {
          points.push({ date: p.date, value: p.value, type: "trend" });
          const rampFraction = (i + 1) / trendForecast.length;
          const tetlockValue = p.value * (1 + weightedChangePct * rampFraction);
          points.push({ date: p.date, value: Math.round(tetlockValue * 100) / 100, type: "tetlock" });
        });

        return {
          seriesId: series.seriesId,
          name: series.name,
          unit: series.seriesId === "CPIAUCSL" ? "Percent year over year" : series.unit,
          points,
        };
      } catch {
        return { seriesId: series.seriesId, name: series.name, unit: series.unit, points: [] };
      }
    }),
  );
}

const SYSTEM_PROMPT = `You are an expert economic forecaster using Philip Tetlock's superforecasting methodology. You must apply:

TETLOCK'S 10 COMMANDMENTS OF SUPERFORECASTING:
1. Triage - Focus on questions where careful thinking pays off
2. Break seemingly intractable problems into tractable sub-problems  
3. Strike the right balance between inside and outside views
4. Strike the right balance between under- and overreacting to evidence
5. Look for the clashing causal forces at work in each problem
6. Strive to distinguish as many degrees of doubt as the problem permits
7. Strike the right balance between under- and overconfidence
8. Look for the errors behind your errors
9. Bring out the best in others and let others bring out the best in you
10. Master the error-balancing cycle: Try, fail, analyze, adjust, try again

TETLOCK'S 7 PILLARS OF SUPERFORECASTING:
1. Probabilistic thinking - Express forecasts as precise probabilities
2. Outside view / base rates - Start with base rates before adjusting
3. Continuous updating - Revise forecasts as new information arrives
4. Cognitive debiasing - Actively counter cognitive biases
5. Granular analysis - Break problems into component parts
6. Diverse information sources - Integrate multiple perspectives
7. Metacognition - Think about your own thinking process

Analyze the current economic landscape considering:
- Current news and major developments
- Geopolitical climate (conflicts, alliances, trade wars, sanctions)
- Geo-economic climate (global trade patterns, supply chains, currency movements)
- Current events affecting markets and economy

For each scenario, specify which Tetlock pillars and commandments were most relevant to your analysis.

You MUST respond with valid JSON only. No markdown, no explanation outside JSON.`;

function buildUserPrompt(indicatorSummary) {
  return `Given these current U.S. economic indicators:

${indicatorSummary}

Analyze the current geopolitical and economic landscape. Generate 5-7 distinct scenarios that could impact the U.S. economy over the next 6-12 months. For each scenario, assign a probability using Tetlock's methodology.

Then, for each economic indicator, calculate a weighted forecast by combining all scenarios' impacts weighted by their probabilities.

Respond with this exact JSON structure:
{
  "scenarios": [
    {
      "name": "Scenario name",
      "description": "Detailed description of the scenario",
      "probability": 0.25,
      "category": "geopolitical|geoeconomic|domestic|trade|monetary",
      "impacts": [
        {
          "indicator": "Indicator name",
          "direction": "up|down|stable",
          "magnitude": 2.5,
          "explanation": "Why this scenario affects this indicator"
        }
      ],
      "reasoning": "Tetlock-style reasoning for this probability",
      "tetlockPillars": ["Probabilistic thinking", "Outside view / base rates"],
      "tetlockCommandments": ["Break seemingly intractable problems into tractable sub-problems"]
    }
  ],
  "weightedForecasts": [
    {
      "indicator": "Indicator name",
      "currentValue": 24100,
      "forecastValue": 24500,
      "weightedChange": 1.66,
      "unit": "Billions of Dollars",
      "confidence": 0.72,
      "equation": "24100 + (0.25 * 200) + (0.15 * -100) + ... = 24500"
    }
  ],
  "methodology": "Brief description of Tetlock methodology applied",
  "analysisDate": "${new Date().toISOString().split("T")[0]}",
  "geopoliticalSummary": "Summary of current geopolitical factors",
  "geoeconomicSummary": "Summary of current geo-economic factors",
  "currentEventsSummary": "Summary of current events affecting the economy"
}`;
}

async function main() {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const indicatorsPath = path.join(OUT_DIR, "indicators.json");
  const raw = await readFile(indicatorsPath, "utf-8");
  const { indicators } = JSON.parse(raw);

  const indicatorSummary = indicators
    .map((ind) => {
      const pct =
        ind.previousValue !== undefined && ind.previousValue !== 0
          ? Math.round(((ind.value - ind.previousValue) / ind.previousValue) * 10000) / 100
          : 0;
      return `${ind.name} (${ind.seriesId}): ${ind.value} ${ind.unit} (${pct > 0 ? "+" : ""}${pct}% change, as of ${ind.date})`;
    })
    .join("\n");

  console.log(`Calling ${OPENAI_BASE_URL} for Tetlock forecast...`);

  const requestBody = JSON.stringify({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(indicatorSummary) },
    ],
    response_format: { type: "json_object" },
    max_tokens: 8000,
  });

  let res;
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: requestBody,
    });

    if (res.ok) break;

    // Free-tier models on OpenRouter sometimes hit a transient upstream
    // rate limit (HTTP 429) shared across all users. Retry with backoff
    // before giving up, rather than treating it as a hard failure.
    if (res.status === 429 && attempt < maxAttempts) {
      const waitMs = attempt * 5000;
      console.log(`Rate-limited (attempt ${attempt}/${maxAttempts}), retrying in ${waitMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    break;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const completion = await res.json();
  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error("No response content from OpenAI");

  const result = JSON.parse(content);
  console.log("Building chart data from FRED history + forecast...");
  const chartData = await buildChartData(result.weightedForecasts);

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, "tetlock-forecast.json"), JSON.stringify({ ...result, chartData }, null, 2));
  await rm(path.join(OUT_DIR, "tetlock-forecast-error.json"), { force: true });

  console.log(`Wrote Tetlock forecast to ${path.join(OUT_DIR, "tetlock-forecast.json")}`);
}

main().catch(async (err) => {
  console.error("generate-forecast failed:", err);
  try {
    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(
      path.join(OUT_DIR, "tetlock-forecast-error.json"),
      JSON.stringify(
        {
          failedAt: new Date().toISOString(),
          message: err?.message || String(err),
          openaiBaseUrl: OPENAI_BASE_URL,
          openaiModel: OPENAI_MODEL,
          hasApiKey: Boolean(OPENAI_API_KEY),
        },
        null,
        2,
      ),
    );
  } catch (writeErr) {
    console.error("Also failed to write error diagnostic file:", writeErr);
  }
  process.exit(1);
});
