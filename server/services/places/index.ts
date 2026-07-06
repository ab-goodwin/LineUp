import type { PlacesAdapter, PlacesSearchResponse } from "./types.js";
import { GeoapifyAdapter } from "./geoapify.js";
import { GooglePlacesAdapter } from "./google.js";

type ProviderName = "geoapify" | "google";

function getAdapter(): PlacesAdapter | null {
  const provider = (process.env.PLACES_PROVIDER ?? "").toLowerCase().trim() as ProviderName;

  if (provider === "geoapify") {
    const key = process.env.GEOAPIFY_API_KEY;
    if (!key) {
      console.warn("[places] PLACES_PROVIDER=geoapify but GEOAPIFY_API_KEY is not set");
      return null;
    }
    return new GeoapifyAdapter(key);
  }

  if (provider === "google") {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) {
      console.warn("[places] PLACES_PROVIDER=google but GOOGLE_PLACES_API_KEY is not set");
      return null;
    }
    return new GooglePlacesAdapter(key);
  }

  if (provider) {
    console.warn(`[places] Unknown PLACES_PROVIDER="${provider}". Supported: geoapify, google`);
  }

  return null;
}

export async function searchPlaces(q: string): Promise<PlacesSearchResponse> {
  const adapter = getAdapter();
  if (!adapter) return { configured: false, results: [] };
  if (!q.trim()) return { configured: true, results: [] };
  try {
    const results = await adapter.search(q.trim());
    return { configured: true, results };
  } catch (err) {
    console.error("[places] search error:", err);
    return { configured: true, results: [] };
  }
}
