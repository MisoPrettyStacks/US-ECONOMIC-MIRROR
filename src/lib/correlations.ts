// Data-driven correlation engine.
//
// Builds a Pearson correlation matrix between every pair of FRED series
// using month-over-month percent changes, so that moving one what-if
// slider can propagate a realistic, historically-grounded effect onto
// every other indicator's forecast - not just the one being dragged.

export type HistoryPoint = { date: string; value: number };
export type HistoryMap = Record<string, HistoryPoint[]>;
export type CorrelationMatrix = Record<string, Record<string, number>>;

function monthKey(date: string): string {
  return date.slice(0, 7); // "YYYY-MM"
}

function allMonthsInRange(history: HistoryMap): string[] {
  let min = "9999-99";
  let max = "0000-00";
  for (const points of Object.values(history)) {
    if (points.length === 0) continue;
    const first = monthKey(points[0].date);
    const last = monthKey(points[points.length - 1].date);
    if (first < min) min = first;
    if (last > max) max = last;
  }
  if (min === "9999-99") return [];

  const months: string[] = [];
  let [y, m] = min.split("-").map(Number);
  const [yEnd, mEnd] = max.split("-").map(Number);
  while (y < yEnd || (y === yEnd && m <= mEnd)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

// Forward-fills each series onto a common monthly grid. Lower-frequency
// series (e.g. quarterly GDP) simply repeat their last known reading until
// the next release; higher-frequency series (e.g. daily 10Y yield) collapse
// to their latest reading within each month.
function toMonthlyGrid(points: HistoryPoint[], months: string[]): (number | null)[] {
  const byMonth = new Map<string, number>();
  for (const p of points) byMonth.set(monthKey(p.date), p.value);

  const out: (number | null)[] = [];
  let last: number | null = null;
  for (const m of months) {
    if (byMonth.has(m)) last = byMonth.get(m)!;
    out.push(last);
  }
  return out;
}

function percentChangeSeries(values: (number | null)[]): (number | null)[] {
  const out: (number | null)[] = [null];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    const cur = values[i];
    if (prev === null || cur === null || prev === 0) {
      out.push(null);
    } else {
      out.push((cur - prev) / Math.abs(prev));
    }
  }
  return out;
}

function pearson(x: (number | null)[], y: (number | null)[]): number {
  const pairs: [number, number][] = [];
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = y[i];
    if (xi !== null && yi !== null && Number.isFinite(xi) && Number.isFinite(yi)) {
      pairs.push([xi, yi]);
    }
  }
  if (pairs.length < 4) return 0;

  const n = pairs.length;
  const meanX = pairs.reduce((s, p) => s + p[0], 0) / n;
  const meanY = pairs.reduce((s, p) => s + p[1], 0) / n;

  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (const [xi, yi] of pairs) {
    const dx = xi - meanX;
    const dy = yi - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  const denom = Math.sqrt(varX * varY);
  if (denom === 0) return 0;
  const r = cov / denom;
  return Math.max(-1, Math.min(1, r));
}

// Computes an NxN Pearson correlation matrix between all series in
// `history`, based on month-over-month percent change. Diagonal is always 1.
export function computeCorrelationMatrix(history: HistoryMap): CorrelationMatrix {
  const months = allMonthsInRange(history);
  const seriesIds = Object.keys(history);

  const pctSeries: Record<string, (number | null)[]> = {};
  for (const id of seriesIds) {
    pctSeries[id] = percentChangeSeries(toMonthlyGrid(history[id], months));
  }

  const matrix: CorrelationMatrix = {};
  for (const a of seriesIds) {
    matrix[a] = {};
    for (const b of seriesIds) {
      matrix[a][b] = a === b ? 1 : pearson(pctSeries[a], pctSeries[b]);
    }
  }
  return matrix;
}

// Returns the series most correlated (by absolute value) with `seriesId`,
// excluding itself and anything with a negligible relationship.
export function topCorrelatedSeries(
  matrix: CorrelationMatrix,
  seriesId: string,
  excludeIds: Set<string> = new Set(),
): { seriesId: string; correlation: number } | null {
  const row = matrix[seriesId];
  if (!row) return null;

  let best: { seriesId: string; correlation: number } | null = null;
  for (const [otherId, corr] of Object.entries(row)) {
    if (otherId === seriesId || excludeIds.has(otherId)) continue;
    if (Math.abs(corr) < 0.15) continue;
    if (!best || Math.abs(corr) > Math.abs(best.correlation)) {
      best = { seriesId: otherId, correlation: corr };
    }
  }
  return best;
}
