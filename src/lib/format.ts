export function formatValue(value: number, seriesId: string): string {
  switch (seriesId) {
    case "GDPC1":
      return `$${(value / 1000).toFixed(1)}T`;
    case "UNRATE":
    case "FEDFUNDS":
    case "DGS10":
    case "CPIAUCSL":
      return `${value.toFixed(2)}%`;
    case "GFDEBTN":
      return `$${(value / 1000000).toFixed(1)}T`;
    case "BOPGSTB":
      return `$${(value / 1000).toFixed(1)}B`;
    case "RSAFS":
      return `$${(value / 1000).toFixed(1)}B`;
    case "INDPRO":
      return value.toFixed(2);
    case "HOUST":
    case "PAYEMS":
      return value.toLocaleString();
    default:
      return value.toLocaleString();
  }
}

export function getSliderRange(seriesId: string, liveValue: number): { min: number; max: number; step: number } {
  switch (seriesId) {
    case "GDPC1":
      return { min: 0, max: Math.round(liveValue * 2), step: 10 };
    case "UNRATE":
    case "FEDFUNDS":
    case "DGS10":
    case "CPIAUCSL":
      return { min: 0, max: 20, step: 0.01 };
    case "GFDEBTN":
      return { min: 0, max: Math.round(liveValue * 2), step: 1000 };
    case "BOPGSTB": {
      const absVal = Math.abs(liveValue);
      return { min: -absVal * 2, max: absVal * 0.5, step: 1 };
    }
    case "RSAFS":
      return { min: 0, max: Math.round(liveValue * 2), step: 100 };
    case "INDPRO":
      return { min: 0, max: Math.round(liveValue * 2 * 100) / 100, step: 0.01 };
    case "HOUST":
      return { min: 0, max: Math.round(liveValue * 2), step: 1 };
    case "PAYEMS":
      return { min: 0, max: Math.round(liveValue * 2), step: 1 };
    default:
      return { min: 0, max: Math.round(liveValue * 2), step: 1 };
  }
}

export function formatSliderValue(value: number, seriesId: string): string {
  switch (seriesId) {
    case "GDPC1":
      return `$${(value / 1000).toFixed(1)}T`;
    case "UNRATE":
    case "FEDFUNDS":
    case "DGS10":
    case "CPIAUCSL":
      return `${value.toFixed(1)}%`;
    case "GFDEBTN":
      return `$${(value / 1000000).toFixed(1)}T`;
    case "BOPGSTB":
      return `$${(value / 1000).toFixed(1)}B`;
    case "RSAFS":
      return `$${(value / 1000).toFixed(1)}B`;
    case "INDPRO":
      return value.toFixed(2);
    case "HOUST":
    case "PAYEMS":
      return value.toLocaleString();
    default:
      return value.toLocaleString();
  }
}
