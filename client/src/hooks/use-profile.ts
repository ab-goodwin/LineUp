import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertUser } from "@shared/routes";

export function useProfile() {
  return useQuery({
    queryKey: [api.profile.get.path],
    queryFn: async () => {
      const res = await fetch(api.profile.get.path);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return api.profile.get.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<InsertUser>) => {
      const res = await fetch(api.profile.update.path, {
        method: api.profile.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return api.profile.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.profile.get.path] });
    },
  });
}

export function useDeleteData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (type: 'sessions' | 'songs' | 'all') => {
      const res = await fetch(api.profile.deleteData.path, {
        method: api.profile.deleteData.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error("Failed to delete data");
      return api.profile.deleteData.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      // Invalidate everything to be safe
      queryClient.invalidateQueries();
    },
  });
}
