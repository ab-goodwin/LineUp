import type { PlacesAdapter, NormalizedPlaceResult } from "./types.js";

export class GeoapifyAdapter implements PlacesAdapter {
  constructor(private apiKey: string) {}

  async search(q: string): Promise<NormalizedPlaceResult[]> {
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(q)}&limit=8&apiKey=${this.apiKey}`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data: any = await resp.json();
    return (data.features || []).map((f: any) => {
      const p = f.properties || {};
      return {
        provider: "geoapify",
        placeId: String(p.place_id ?? `${p.lat},${p.lon}`),
        name: p.name || p.address_line1 || p.formatted || q,
        formattedAddress: p.formatted ?? null,
        city: p.city ?? null,
        state: p.state ?? null,
        country: p.country ?? null,
        latitude: typeof p.lat === "number" ? p.lat : null,
        longitude: typeof p.lon === "number" ? p.lon : null,
      } satisfies NormalizedPlaceResult;
    });
  }
}
