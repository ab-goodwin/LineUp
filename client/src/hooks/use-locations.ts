import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { NormalizedPlace } from "@shared/schema";

const LOCATIONS_KEY = "/api/locations";

interface PlaceSearchResponse {
  configured: boolean;
  results: NormalizedPlace[];
}

// Debounced place-search against the backend proxy. When no provider is
// configured, `configured` is false and the UI falls back to manual text entry.
export function usePlaceSearch(query: string) {
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  return useQuery<PlaceSearchResponse>({
    queryKey: ["/api/places/search", debounced],
    enabled: debounced.trim().length >= 2,
    queryFn: async () => {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(debounced.trim())}`, { credentials: "include" });
      if (!res.ok) throw new Error("Place search failed");
      return res.json();
    },
  });
}

export function useLocations() {
  return useQuery({
    queryKey: [LOCATIONS_KEY],
    queryFn: async () => {
      const res = await fetch(LOCATIONS_KEY, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json() as Promise<Array<{ id: number; userId: number | null; name: string }>>;
    },
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(LOCATIONS_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create location");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOCATIONS_KEY] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${LOCATIONS_KEY}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete location");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOCATIONS_KEY] });
    },
  });
}
