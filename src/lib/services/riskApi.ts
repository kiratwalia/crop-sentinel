import { getApiBaseUrl } from "./cropcareApi";

export interface RiskScoresPayload {
  disease: number;
  pest: number;
  environmental: number;
  overall: number;
  risk_level: "low" | "moderate" | "high" | "severe";
}

export interface WeatherSummary {
  temperatureC: number;
  humidity: number;
  rainfallMm: number;
  windKph: number;
  condition: string;
}

export interface SingleCropRiskResponse {
  status: "ok" | "unavailable";
  crop: string;
  weather: WeatherSummary | null;
  scores: RiskScoresPayload;
  message?: string;
}

export interface CropRiskItem {
  crop: string;
  scores: RiskScoresPayload;
}

export interface MultiCropRiskResponse {
  status: "ok" | "unavailable";
  weather: WeatherSummary | null;
  crops: CropRiskItem[];
  message?: string;
}

export interface RiskForecastDay {
  date: string;
  day: string; // e.g. "Mon", "Tue"
  disease: number;
  pest: number;
  environmental: number;
  overall: number;
  risk_level: "low" | "moderate" | "high" | "severe";
}

export interface RiskForecastResponse {
  status: "ok" | "unavailable";
  crop: string;
  forecast: RiskForecastDay[];
  message?: string;
}

/**
 * Fetch risk scores for a single crop or default overview.
 */
export async function fetchCropRiskApi(
  crop: string,
  coords?: { lat?: number; lng?: number },
  signal?: AbortSignal,
): Promise<SingleCropRiskResponse> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams();
  params.set("crop", crop.toLowerCase());
  if (typeof coords?.lat === "number") params.set("lat", String(coords.lat));
  if (typeof coords?.lng === "number") params.set("lng", String(coords.lng));

  const res = await fetch(`${base}/api/risk?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch crop risk (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Fetch risk scores across all 5 supported crops simultaneously.
 */
export async function fetchAllCropRisksApi(
  coords?: { lat?: number; lng?: number },
  signal?: AbortSignal,
): Promise<MultiCropRiskResponse> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams();
  if (typeof coords?.lat === "number") params.set("lat", String(coords.lat));
  if (typeof coords?.lng === "number") params.set("lng", String(coords.lng));
  const qs = params.toString();

  const res = await fetch(`${base}/api/risk${qs ? `?${qs}` : ""}`, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch multi-crop risk (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Fetch 7-day weather-driven risk forecast for a specified crop.
 */
export async function fetchRiskForecastApi(
  crop: string = "potato",
  coords?: { lat?: number; lng?: number },
  signal?: AbortSignal,
): Promise<RiskForecastResponse> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams();
  params.set("crop", crop.toLowerCase());
  if (typeof coords?.lat === "number") params.set("lat", String(coords.lat));
  if (typeof coords?.lng === "number") params.set("lng", String(coords.lng));

  const res = await fetch(`${base}/api/risk/forecast?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch risk forecast (HTTP ${res.status})`);
  }
  const data = await res.json();

  // Attach human-readable short day name (e.g. "Mon")
  if (Array.isArray(data.forecast)) {
    data.forecast = data.forecast.map((item: any) => {
      let dayName = item.date;
      try {
        const d = new Date(item.date + "T00:00:00");
        dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      } catch {
        dayName = item.date;
      }
      return {
        ...item,
        day: dayName,
      };
    });
  }

  return data;
}
