import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const LOCATIONS_KEY = "/api/locations";

export function useLocations() {
  return useQuery({
    queryKey: [LOCATIONS_KEY],
    queryFn: async () => {
      const res = await apiFetch(LOCATIONS_KEY, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json() as Promise<Array<{ id: number; userId: number | null; name: string }>>;
    },
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await apiFetch(LOCATIONS_KEY, {
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
      const res = await apiFetch(`${LOCATIONS_KEY}/${id}`, {
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
