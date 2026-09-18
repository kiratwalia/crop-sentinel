import type { CropId, Recommendation } from "@/types";
import { getApiBaseUrl } from "./cropcareApi";

export interface BackendRecommendationItem {
  id: string;
  priority: "high" | "medium" | "low";
  category: "immediate" | "monitoring" | "preventive";
  title: string;
  description: string;
  reason: string;
  crop: string;
  steps?: string[];
  organic?: string[];
  chemical?: string[];
}

export interface BackendRecommendationsResponse {
  status: "ok" | "error";
  crop: string;
  recommendations: BackendRecommendationItem[];
}

function normalizeRecommendation(item: BackendRecommendationItem): Recommendation {
  const priorityMapping: Record<string, "urgent" | "this-week" | "preventive"> = {
    immediate: "urgent",
    monitoring: "this-week",
    preventive: "preventive",
    high: "urgent",
    medium: "this-week",
    low: "preventive",
  };

  const uiPriority = priorityMapping[item.category] || priorityMapping[item.priority] || "this-week";

  return {
    id: item.id,
    cropId: (item.crop.toLowerCase() as CropId) || "potato",
    title: item.title,
    priority: uiPriority,
    why: item.reason || item.description,
    steps: Array.isArray(item.steps) && item.steps.length > 0
      ? item.steps
      : [item.description],
    organic: Array.isArray(item.organic) && item.organic.length > 0
      ? item.organic
      : ["Maintain routine organic soil and crop hygiene"],
    chemical: Array.isArray(item.chemical) && item.chemical.length > 0
      ? item.chemical
      : ["Follow product label and local agricultural guidance."],
  };
}

/**
 * Fetch context-aware recommendations from the backend.
 * If crop is 'all' or empty, queries all 5 supported crops and aggregates them.
 */
export async function fetchRecommendationsApi(options?: {
  crop?: string;
  analysisId?: string;
  coords?: { lat?: number; lng?: number };
  token?: string;
  signal?: AbortSignal;
}): Promise<Recommendation[]> {
  const base = getApiBaseUrl();
  const targetCrop = options?.crop?.trim().toLowerCase();

  const supportedCrops: CropId[] = ["tomato", "potato", "maize", "grape", "apple"];

  if (!targetCrop || targetCrop === "all") {
    // Fetch for all supported crops in parallel
    const promises = supportedCrops.map(async (c) => {
      try {
        const params = new URLSearchParams();
        params.set("crop", c);
        if (typeof options?.coords?.lat === "number") params.set("lat", String(options.coords.lat));
        if (typeof options?.coords?.lng === "number") params.set("lng", String(options.coords.lng));

        const res = await fetch(`${base}/api/recommendations?${params.toString()}`, {
          signal: options?.signal,
          headers: options?.token ? { Authorization: `Bearer ${options.token}` } : {},
        });
        if (!res.ok) return [];
        const json = (await res.json()) as BackendRecommendationsResponse;
        return (json.recommendations || []).map(normalizeRecommendation);
      } catch {
        return [];
      }
    });

    const results = await Promise.all(promises);
    return results.flat();
  }

  // Single crop fetch
  const params = new URLSearchParams();
  params.set("crop", targetCrop);
  if (options?.analysisId) params.set("analysis_id", options.analysisId);
  if (typeof options?.coords?.lat === "number") params.set("lat", String(options.coords.lat));
  if (typeof options?.coords?.lng === "number") params.set("lng", String(options.coords.lng));

  const res = await fetch(`${base}/api/recommendations?${params.toString()}`, {
    signal: options?.signal,
    headers: options?.token ? { Authorization: `Bearer ${options.token}` } : {},
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch recommendations (HTTP ${res.status})`);
  }

  const json = (await res.json()) as BackendRecommendationsResponse;
  return (json.recommendations || []).map(normalizeRecommendation);
}
