/**
 * Centralized HTTP client for the CropCare FastAPI backend.
 *
 * - Uses VITE_API_BASE_URL from .env (default http://localhost:8000).
 * - POSTs multipart/form-data to /api/analyze (crop, analysis_type, image).
 * - Throws typed BackendApiError with the validation field when the backend
 *   returns 4xx / 5xx, so the Analyze page can show a friendly message and
 *   a retry CTA.
 *
 * Callers should import from `./cropcare.ts` instead of this file directly;
 * the `analyzeImage` entry point in `./cropcare.ts` orchestrates this API,
 * stores the result and returns a `StoredAnalysis` id for the Result page.
 */
import type {
  AnalysisMode,
  BackendAnalysisResponse,
  BackendApiError,
  CropId,
} from "@/types";
import { crops as mockCrops } from "@/data/mock";

const DEFAULT_BASE_URL = "http://localhost:8000";

const MODE_TO_ANALYSIS_TYPE: Record<AnalysisMode, "disease" | "pest" | "both"> = {
  disease: "disease",
  pest: "pest",
  auto: "both",
};

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export function getApiBaseUrl(): string {
  const vite = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const value = vite?.VITE_API_BASE_URL;
  if (value && value.trim()) return value.replace(/\/$/, "");
  return DEFAULT_BASE_URL;
}

export function cropIdToApiCropName(cropId: CropId): string {
  const match = mockCrops.find((c) => c.id === cropId);
  return match?.name ?? cropId.slice(0, 1).toUpperCase() + cropId.slice(1);
}

export interface ImageValidationError {
  reason: "missing" | "invalid-type" | "too-large" | "empty";
  maxBytes?: number;
  allowedTypes?: string[];
  message: string;
}

export function validateImageForApi(file: File | null | undefined): ImageValidationError | null {
  if (!file) {
    return {
      reason: "missing",
      message: "Upload a leaf photo before running the analysis.",
    };
  }
  if (file.size <= 0) {
    return {
      reason: "empty",
      message: "The selected file is empty. Please choose a different image.",
    };
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
    return {
      reason: "invalid-type",
      allowedTypes: Array.from(ALLOWED_IMAGE_TYPES),
      message: `Unsupported image format (${file.type || "unknown"}). Use JPG, PNG or WebP.`,
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      reason: "too-large",
      maxBytes: MAX_IMAGE_BYTES,
      message: `This image is too large (${Math.round(file.size / 1024 / 1024)} MB). Choose one smaller than ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`,
    };
  }
  return null;
}

export async function analyzeImageApi(input: {
  cropId: CropId;
  mode: AnalysisMode;
  file: File;
  signal?: AbortSignal;
}): Promise<BackendAnalysisResponse> {
  const base = getApiBaseUrl();
  const form = new FormData();
  form.append("crop", cropIdToApiCropName(input.cropId));
  form.append("analysis_type", MODE_TO_ANALYSIS_TYPE[input.mode]);
  form.append("image", input.file, input.file.name);

  const controller = new AbortController();
  const manualSignal = controller.signal;
  if (input.signal) {
    if (input.signal.aborted) controller.abort();
    else input.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/analyze`, {
      method: "POST",
      body: form,
      signal: manualSignal,
    });
  } catch (err) {
    const networkErr: BackendApiError = {
      field: undefined,
      statusCode: 0,
      error:
        err instanceof Error && err.name === "AbortError"
          ? "Request cancelled"
          : "Network error",
      detail: err instanceof Error ? err.message : String(err),
      message:
        err instanceof Error && err.name === "AbortError"
          ? "Analysis was cancelled."
          : `Could not reach the CropCare backend at ${base}. Check it is running or your connection.`,
    };
    throw networkErr;
  }

  const rawText = await res.text();
  let parsed: unknown;
  try {
    parsed = rawText ? (JSON.parse(rawText) as unknown) : undefined;
  } catch {
    parsed = undefined;
  }

  if (!res.ok) {
    const error: BackendApiError = {
      statusCode: res.status,
      error: res.statusText || "HTTP error",
      rawBody: parsed ?? rawText,
    };
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj.detail === "object" && obj.detail !== null) {
        const d = obj.detail as Record<string, unknown>;
        if (typeof d.field === "string") error.field = d.field;
        if (typeof d.message === "string") error.message = d.message;
        error.detail = obj.detail;
      } else if (typeof obj.detail === "string") {
        error.message = obj.detail;
      }
      if (!error.message && typeof obj.message === "string") error.message = obj.message;
    }
    if (!error.message) {
      error.message =
        res.status === 413
          ? "The uploaded image is too large for the server."
          : res.status >= 500
            ? "The backend service hit a problem. Please retry in a moment."
            : `Server returned status ${res.status}.`;
    }
    throw error;
  }

  if (!parsed || typeof parsed !== "object") {
    const bad: BackendApiError = {
      statusCode: res.status,
      error: "Invalid response",
      rawBody: parsed ?? rawText,
      message: "Unexpected response from the analysis service.",
    };
    throw bad;
  }

  const obj = parsed as Record<string, unknown>;
  return {
    crop: typeof obj.crop === "string" ? obj.crop : "",
    condition: typeof obj.condition === "string" ? obj.condition : "Unknown",
    type: obj.type === "pest" ? "pest" : "disease",
    confidence: typeof obj.confidence === "number" ? obj.confidence : 0,
    severity: typeof obj.severity === "string" ? obj.severity : "Medium",
    risk: typeof obj.risk === "string" ? obj.risk : "Medium",
    symptoms: Array.isArray(obj.symptoms) ? (obj.symptoms as string[]) : [],
    immediate_actions: Array.isArray(obj.immediate_actions) ? (obj.immediate_actions as string[]) : [],
    prevention: Array.isArray(obj.prevention) ? (obj.prevention as string[]) : [],
    environmental_factors: Array.isArray(obj.environmental_factors)
      ? (obj.environmental_factors as string[])
      : [],
    demo: typeof obj.demo === "boolean" ? obj.demo : undefined,
  };
}

export async function healthCheckApi(signal?: AbortSignal): Promise<{ status: string; service: string }> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/health`, { signal });
  if (!res.ok) throw new Error(`Health check failed with status ${res.status}.`);
  const json = (await res.json()) as { status?: string; service?: string };
  return { status: json.status ?? "unknown", service: json.service ?? "CropCare AI Backend" };
}
