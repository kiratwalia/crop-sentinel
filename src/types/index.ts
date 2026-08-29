export type CropId = "tomato" | "potato" | "maize" | "wheat" | "rice";

export type AnalysisMode = "disease" | "pest" | "auto";

export type Severity = "low" | "moderate" | "high" | "critical";

export type RiskLevel = "low" | "moderate" | "high" | "severe";

export interface Crop {
  id: CropId;
  name: string;
  localName: string;
  emoji: string;
  season: string;
  healthScore: number;
}

export interface Finding {
  id: string;
  kind: "disease" | "pest";
  name: string;
  scientificName: string;
  crops: CropId[];
  summary: string;
  symptoms: string[];
  immediateActions: string[];
  prevention: string[];
  organicOptions: string[];
  chemicalOptions: string[];
  favourableConditions: string[];
}

export interface EnvFactor {
  label: string;
  value: string;
  contribution: number; // 0-100
  note: string;
}

export interface Analysis {
  id: string;
  cropId: CropId;
  mode: AnalysisMode;
  findingId: string;
  confidence: number; // 0-100
  severity: Severity;
  riskLevel: RiskLevel;
  imageUrl: string;
  createdAt: string; // ISO
  affectedArea: number; // % of leaf
  envFactors: EnvFactor[];
  isSample: boolean;
}

export interface WeatherNow {
  temperatureC: number;
  humidity: number;
  rainfallMm: number;
  windKph: number;
  condition: string;
  location: string;
  updatedAt: string;
}

export interface RiskScores {
  disease: number;
  pest: number;
  environmental: number;
  overall: number;
}

export interface RiskForecastPoint {
  day: string;
  disease: number;
  pest: number;
  environmental: number;
}

export interface HealthTrendPoint {
  date: string;
  health: number;
  risk: number;
}

export interface Alert {
  id: string;
  cropId: CropId;
  title: string;
  detail: string;
  severity: Severity;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  cropId: CropId;
  title: string;
  priority: "urgent" | "this-week" | "preventive";
  why: string;
  steps: string[];
  organic: string[];
  chemical: string[];
}
