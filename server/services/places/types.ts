export interface NormalizedPlaceResult {
  provider: string;
  placeId: string;
  name: string;
  formattedAddress: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PlacesSearchResponse {
  configured: boolean;
  results: NormalizedPlaceResult[];
}

export interface PlacesAdapter {
  search(q: string): Promise<NormalizedPlaceResult[]>;
}
