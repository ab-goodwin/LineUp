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

interface LocationSearchResponse {
  results: LocationOption[];
}

interface CreateLocationInput {
  name: string;
  city?: string | null;
  state?: string | null;
}

/**
 * Returns the user's favorite locations first, followed by their most recently
 * used dance locations. This query is used while the search box is empty.
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
 * Debounced search against the shared global location directory.
 *
 * This no longer calls Google or Geoapify. Because it searches LineUp's own
 * database, users can search from the first character without generating API
 * charges.
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
 * Adds a new location to the global directory. The backend also saves it as a
 * favorite for the user who created it.
 */
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation<LocationOption, Error, CreateLocationInput | string>({
    mutationFn: async (input) => {
      const payload: CreateLocationInput =
        typeof input === "string" ? { name: input } : input;

      const res = await fetch(LOCATIONS_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.message || "Failed to create location");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOCATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [LOCATION_SEARCH_KEY] });
    },
  });
}

/**
 * Adds an existing global location to the user's favorites, or removes its
 * favorite status while keeping the global location intact.
 */
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

/**
 * Removes a location from this user's saved list. It does not delete the
 * shared global location or affect other users' sessions.
 */
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
