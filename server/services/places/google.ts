import type { PlacesAdapter, NormalizedPlaceResult } from "./types.js";

const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents";

type AddressComponent = {
  longText: string;
  shortText: string;
  types: string[];
};

function extractComponent(components: AddressComponent[], type: string): string | null {
  return components.find(c => c.types.includes(type))?.longText ?? null;
}

export class GooglePlacesAdapter implements PlacesAdapter {
  constructor(private apiKey: string) {}

  async search(q: string): Promise<NormalizedPlaceResult[]> {
    const resp = await fetch(TEXT_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({ textQuery: q, maxResultCount: 8 }),
    });
    if (!resp.ok) return [];
    const data: any = await resp.json();
    return (data.places || []).map((place: any) => {
      const components: AddressComponent[] = place.addressComponents || [];
      return {
        provider: "google",
        placeId: String(place.id ?? ""),
        name: place.displayName?.text ?? place.formattedAddress ?? q,
        formattedAddress: place.formattedAddress ?? null,
        city: extractComponent(components, "locality") ?? extractComponent(components, "postal_town"),
        state: extractComponent(components, "administrative_area_level_1"),
        country: extractComponent(components, "country"),
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
      } satisfies NormalizedPlaceResult;
    });
  }
}
