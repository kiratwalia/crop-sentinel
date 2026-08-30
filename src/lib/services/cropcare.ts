/**
 * Data access layer for CropCare AI.
 *
 * Every function here returns a promise with simulated latency so that each one
 * can later be replaced by a real call (FastAPI + PyTorch inference service,
 * a database read, or a weather API) without touching any component.
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
  WeatherNow,
} from "@/types";

const delay = <T>(value: T, ms = 220) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

/**
 * Analyses created by the user during the demo.
 *
 * They live in `sessionStorage` so a result URL keeps working after a refresh
 * or when it is opened directly, and in a module array as a fallback for
 * server rendering and for browsers where storage is unavailable.
 */
const STORAGE_KEY = "cropcare.analyses.v1";
const MAX_STORED_ANALYSES = 8;
const sessionAnalyses: Analysis[] = [];

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isAnalysis(value: unknown): value is Analysis {
  if (typeof value !== "object" || value === null) return false;
  const a = value as Partial<Analysis>;
  return (
    typeof a.id === "string" &&
    typeof a.cropId === "string" &&
    typeof a.findingId === "string" &&
    typeof a.imageUrl === "string" &&
    typeof a.createdAt === "string" &&
    typeof a.confidence === "number" &&
    typeof a.affectedArea === "number" &&
    Array.isArray(a.envFactors)
  );
}

function readStored(): Analysis[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isAnalysis) : [];
  } catch {
    return [];
  }
}

function writeStored(list: Analysis[]) {
  const store = storage();
  if (!store) return;
  // Photos are stored inline, so drop the oldest entries until the quota fits.
  let candidates = list.slice(0, MAX_STORED_ANALYSES);
  while (candidates.length) {
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(candidates));
      return;
    } catch {
      candidates = candidates.slice(0, -1);
    }
  }
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // storage is full or blocked — the in-memory copy still serves this page
  }
}

function saveAnalysis(analysis: Analysis) {
  sessionAnalyses.unshift(analysis);
  writeStored([analysis, ...readStored().filter((a) => a.id !== analysis.id)]);
}

function userAnalyses(): Analysis[] {
  const byId = new Map<string, Analysis>();
  for (const analysis of [...sessionAnalyses, ...readStored()]) {
    if (!byId.has(analysis.id)) byId.set(analysis.id, analysis);
  }
  return [...byId.values()];
}

export const getCrops = () => delay<Crop[]>(crops);
export const getWeather = () => delay<WeatherNow>(weatherNow);
export const getRiskScores = () => delay<RiskScores>(riskScores);
export const getRiskForecast = () => delay<RiskForecastPoint[]>(riskForecast);
export const getHealthTrend = () => delay<HealthTrendPoint[]>(healthTrend);
export const getAlerts = () => delay<Alert[]>(alerts);
export const getRecommendations = () => delay<Recommendation[]>(recommendations);
export const getFinding = (id: string): Finding | undefined => findingById(id);

export function getHistory(): Promise<Analysis[]> {
  const all = [...userAnalyses(), ...sampleAnalyses].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
  return delay(all);
}

/** Resolves to `null` — not `undefined` — when the analysis genuinely does not exist. */
export function getAnalysis(id: string): Promise<Analysis | null> {
  const found = [...userAnalyses(), ...sampleAnalyses].find((a) => a.id === id);
  return delay(found ? withEnvFactors(found) : null, 120);
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
 * Demo inference. Replace this body with a POST to the FastAPI/PyTorch endpoint.
 * The returned shape is intentionally identical to what a real model response
 * would provide.
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
    id: `an-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
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
  saveAnalysis(stored);
  return stored;
}
