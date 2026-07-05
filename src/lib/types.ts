export interface FredIndicator {
  seriesId: string;
  name: string;
  value: number;
  unit: string;
  date: string;
  percentChange: number;
  category: string;
}

export interface FredObservation {
  date: string;
  value: number;
}

export interface ForecastPoint {
  date: string;
  value: number;
  type: "historical" | "forecast";
}

export interface WhatIfForecast {
  seriesId: string;
  name: string;
  unit: string;
  points: ForecastPoint[];
}

export interface ScenarioImpact {
  indicator: string;
  direction: "up" | "down" | "stable";
  magnitude: number;
  explanation: string;
}

export interface TetlockScenario {
  name: string;
  description: string;
  probability: number;
  category: string;
  impacts: ScenarioImpact[];
  reasoning: string;
  tetlockPillars: string[];
  tetlockCommandments: string[];
}

export interface TetlockWeightedForecast {
  indicator: string;
  currentValue: number;
  forecastValue: number;
  weightedChange: number;
  unit: string;
  confidence: number;
  equation: string;
}

export interface TetlockChartPoint {
  date: string;
  value: number;
  type: "historical" | "trend" | "tetlock";
}

export interface TetlockChartSeries {
  seriesId: string;
  name: string;
  unit: string;
  points: TetlockChartPoint[];
}

export interface TetlockForecastResponse {
  scenarios: TetlockScenario[];
  weightedForecasts: TetlockWeightedForecast[];
  chartData: TetlockChartSeries[];
  methodology: string;
  analysisDate: string;
  geopoliticalSummary: string;
  geoeconomicSummary: string;
  currentEventsSummary: string;
}

export interface SliderConfig {
  seriesId: string;
  name: string;
  min: number;
  max: number;
  step: number;
  liveValue: number;
  currentValue: number;
  format: (v: number) => string;
}
