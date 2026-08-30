/**
 * Data access layer for CropCare AI.
 *
 * Legacy demo functions (`getAnalysis`, legacy `analyzeImage`) keep the existing
 * Result + History pages working against sample data.
 *
 * The new real path uses the FastAPI backend via `./cropcareApi`:
 *   - `analyzeImageWithBackend` → POST `/api/analyze` → stores a
 *     `StoredAnalysis.source === "backend"` record → returns its id.
 *   - `getAnyAnalysis` → returns `StoredAnalysis | undefined` (backend first,
 *     then the demo store) so the Result page can render either shape.
 */
import {
  alerts,
  crops,
  findings,
  findingById,
  healthTrend,
  recommendations,
  riskForecast,
  riskScores,
  sampleAnalyses,
  weatherNow,
} from "@/data/mock";
import type {
  Alert,
  Analysis,
  AnalysisMode,
  BackendAnalysisResponse,
  Crop,
  CropId,
  EnvFactor,
  Finding,
  HealthTrendPoint,
  Recommendation,
  RiskForecastPoint,
  RiskLevel,
  RiskScores,
  Severity,
  StoredAnalysis,
  WeatherNow,
} from "@/types";
import {
  analyzeImageApi,
  type BackendApiError,
  validateImageForApi,
  type ImageValidationError,
} from "./cropcareApi";

const delay = <T>(value: T, ms = 220) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

/** In-session store for analyses created by the user during the demo. */
const sessionAnalyses: Analysis[] = [];

/** In-session store for analyses that came back from the FastAPI backend. */
const backendAnalyses: Extract<StoredAnalysis, { source: "backend" }>[] = [];

export type { BackendApiError, ImageValidationError };

export const getCrops = () => delay<Crop[]>(crops);
export const getWeather = () => delay<WeatherNow>(weatherNow);
export const getRiskScores = () => delay<RiskScores>(riskScores);
export const getRiskForecast = () => delay<RiskForecastPoint[]>(riskForecast);
export const getHealthTrend = () => delay<HealthTrendPoint[]>(healthTrend);
export const getAlerts = () => delay<Alert[]>(alerts);
export const getRecommendations = () => delay<Recommendation[]>(recommendations);
export const getFinding = (id: string): Finding | undefined => findingById(id);

export { validateImageForApi } from "./cropcareApi";

export function getHistory(): Promise<Analysis[]> {
  const all = [...sessionAnalyses, ...sampleAnalyses].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
  return delay(all);
}

export function getAnalysis(id: string): Promise<Analysis | undefined> {
  const found = [...sessionAnalyses, ...sampleAnalyses].find((a) => a.id === id);
  return delay(found ? withEnvFactors(found) : undefined, 120);
}

export function getAnyAnalysis(id: string): Promise<StoredAnalysis | undefined> {
  const backendMatch = backendAnalyses.find((a) => a.id === id);
  if (backendMatch) return delay(backendMatch, 60);
  const demoMatch = [...sessionAnalyses, ...sampleAnalyses].find((a) => a.id === id);
  if (!demoMatch) return delay(undefined, 60);
  return delay<StoredAnalysis>({ ...withEnvFactors(demoMatch), source: "demo" }, 60);
}

function severityFromArea(area: number): Severity {
  if (area >= 40) return "critical";
  if (area >= 25) return "high";
  if (area >= 10) return "moderate";
  return "low";
}

function riskFromSeverity(sev: Severity): RiskLevel {
  return sev === "critical" ? "severe" : sev === "high" ? "high" : sev === "moderate" ? "moderate" : "low";
}

function hashString(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) % 100000;
  return h;
}

function withEnvFactors(analysis: Analysis): Analysis {
  if (analysis.envFactors.length) return analysis;
  const finding = findingById(analysis.findingId);
  const factors: EnvFactor[] = [
    {
      label: "Humidity",
      value: `${weatherNow.humidity}%`,
      contribution: Math.min(96, weatherNow.humidity + 8),
      note: "High leaf wetness helps fungal spores germinate.",
    },
    {
      label: "Temperature",
      value: `${weatherNow.temperatureC}°C`,
      contribution: 71,
      note: finding?.favourableConditions[0] ?? "Within the favourable range for infection.",
    },
    {
      label: "Rainfall (last 24h)",
      value: `${weatherNow.rainfallMm} mm`,
      contribution: 64,
      note: "Rain splash carries spores from soil to lower leaves.",
    },
    {
      label: "Wind",
      value: `${weatherNow.windKph} km/h`,
      contribution: 38,
      note: "Light wind spreads spores slowly between plants.",
    },
  ];
  return { ...analysis, envFactors: factors };
}

/**
 * Demo inference. Kept for backwards compatibility with pages that have not
 * been switched to the FastAPI backend yet. New flows should use
 * `analyzeImageWithBackend`.
 */
export async function analyzeImage(input: {
  cropId: CropId;
  mode: AnalysisMode;
  imageUrl: string;
  fileName: string;
}): Promise<Analysis> {
  await delay(null, 2200);

  const pool = findings.filter(
    (f) =>
      f.crops.includes(input.cropId) &&
      f.id !== "healthy" &&
      (input.mode === "auto" || f.kind === input.mode),
  );
  const seed = hashString(input.fileName + input.cropId + input.mode);
  const healthy = findings.find((f) => f.id === "healthy")!;
  const finding = pool[seed % pool.length] ?? healthy;
  const isHealthy = finding.id === "healthy";
  const affectedArea = isHealthy ? 0 : 12 + (seed % 33);
  const severity = severityFromArea(affectedArea);
  const confidence = isHealthy ? 94 : 76 + (seed % 20);

  const analysis: Analysis = {
    id: `an-${Date.now().toString().slice(-6)}`,
    cropId: input.cropId,
    mode: input.mode,
    findingId: finding.id,
    confidence,
    severity,
    riskLevel: riskFromSeverity(severity),
    imageUrl: input.imageUrl,
    createdAt: new Date().toISOString(),
    affectedArea,
    envFactors: [],
    isSample: true,
  };

  const stored = withEnvFactors(analysis);
  sessionAnalyses.unshift(stored);
  return stored;
}

/**
 * Upload an image to the FastAPI backend at `POST /api/analyze` and store the
 * raw backend response in `backendAnalyses` for rendering on the Result page.
 *
 * Throws either:
 *   - `ImageValidationError` (client-side, never hits the network) when the
 *     image is missing / of wrong MIME / empty / too big.
 *   - `BackendApiError` when the network / backend returns a problem (field +
 *     message mirrors the backend's validation JSON).
 */
export async function analyzeImageWithBackend(input: {
  cropId: CropId;
  mode: AnalysisMode;
  imageUrl: string;
  fileName: string;
  file: File;
  signal?: AbortSignal;
}): Promise<Extract<StoredAnalysis, { source: "backend" }>> {
  const preValidation = validateImageForApi(input.file);
  if (preValidation) {
    // rethrow as a typed error so callers have one shape
    const err: BackendApiError = {
      field: "image",
      statusCode: 400,
      error: "Invalid image",
      message: preValidation.message,
      detail: preValidation,
    };
    throw err;
  }

  const resp: BackendAnalysisResponse = await analyzeImageApi({
    cropId: input.cropId,
    mode: input.mode,
    file: input.file,
    signal: input.signal,
  });

  const record: Extract<StoredAnalysis, { source: "backend" }> = {
    id: `bk-${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(2, 6)}`,
    source: "backend",
    cropId: input.cropId,
    mode: input.mode,
    imageUrl: input.imageUrl,
    fileName: input.fileName,
    createdAt: new Date().toISOString(),
    backend: resp,
  };
  backendAnalyses.unshift(record);
  return record;
}
