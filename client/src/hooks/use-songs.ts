import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateSongRequest } from "@shared/routes";

export function useSongs() {
  return useQuery({
    queryKey: [api.songs.list.path],
    queryFn: async () => {
      const res = await fetch(api.songs.list.path);
      if (!res.ok) throw new Error("Failed to fetch songs");
      return api.songs.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSongRequest) => {
      const res = await fetch(api.songs.create.path, {
        method: api.songs.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create song");
      return api.songs.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.songs.list.path] });
      // Also invalidate stats as total dances might change technically if tied to library count
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
    },
  });
}

export function useUpdateSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<CreateSongRequest>) => {
      const url = buildUrl(api.songs.update.path, { id });
      const res = await fetch(url, {
        method: api.songs.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update song");
      return api.songs.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.songs.list.path] });
    },
  });
}

export function useDeleteSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.songs.delete.path, { id });
      const res = await fetch(url, { method: api.songs.delete.method });
      if (!res.ok) throw new Error("Failed to delete song");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.songs.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
    },
  });
}
