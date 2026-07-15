import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const LOCATIONS_KEY = "/api/locations";
const LOCATION_SEARCH_KEY = "/api/locations/search";

export interface LocationOption {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  isFavorite: boolean;
  lastUsedAt: string | null;
  usageCount?: number;
  matchScore?: number;
}

export interface LocationDuplicate {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  matchScore: number;
}

interface LocationSearchResponse {
  results: LocationOption[];
}

interface CreateLocationInput {
  name: string;
  city: string;
  state: string;
  confirmCreate?: boolean;
}

interface CreateLocationErrorBody {
  message?: string;
  duplicates?: LocationDuplicate[];
}

export class LocationApiError extends Error {
  status: number;
  duplicates: LocationDuplicate[];

  constructor(status: number, body: CreateLocationErrorBody) {
    super(body.message || "Location request failed");
    this.name = "LocationApiError";
    this.status = status;
    this.duplicates = body.duplicates ?? [];
  }
}

/**
 * Returns favorites first, followed by recently used session locations.
 */
export function useLocations(limit = 6) {
  return useQuery<LocationOption[]>({
    queryKey: [LOCATIONS_KEY, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) });
      const res = await fetch(`${LOCATIONS_KEY}?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch locations");
      }

      return res.json();
    },
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Debounced search against LineUp's shared global location directory.
 */
export function useLocationSearch(query: string, limit = 6) {
  const [debounced, setDebounced] = useState(query.trim());

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebounced(query.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  return useQuery<LocationSearchResponse>({
    queryKey: [LOCATION_SEARCH_KEY, debounced, limit],
    enabled: debounced.length > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debounced,
        limit: String(limit),
      });

      const res = await fetch(`${LOCATION_SEARCH_KEY}?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Location search failed");
      }

      return res.json();
    },
  });
}

/**
 * Creates a global location. The server returns 409 with likely duplicates
 * unless confirmCreate is true.
 */
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation<LocationOption, LocationApiError, CreateLocationInput>({
    mutationFn: async (input) => {
      const res = await fetch(LOCATIONS_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new LocationApiError(res.status, body);
      }

      return {
        id: body.id,
        name: body.name,
        city: body.city ?? null,
        state: body.state ?? null,
        country: body.country ?? "United States",
        isFavorite: true,
        lastUsedAt: null,
        usageCount: body.usageCount ?? 0,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOCATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [LOCATION_SEARCH_KEY] });
    },
  });
}

export function useSetLocationFavorite() {
  const queryClient = useQueryClient();

  return useMutation<
    { ok: boolean; locationId: number; isFavorite: boolean },
    Error,
    { locationId: number; isFavorite: boolean }
  >({
    mutationFn: async ({ locationId, isFavorite }) => {
      const res = await fetch(`${LOCATIONS_KEY}/${locationId}/favorite`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.message || "Failed to update favorite");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOCATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [LOCATION_SEARCH_KEY] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(`${LOCATIONS_KEY}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.message || "Failed to remove saved location");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOCATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [LOCATION_SEARCH_KEY] });
    },
  });
}
