import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateSessionRequest } from "@shared/routes";

export function useSessions() {
  return useQuery({
    queryKey: [api.sessions.list.path],
    queryFn: async () => {
      const res = await fetch(api.sessions.list.path);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return api.sessions.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSessionRequest) => {
      const res = await fetch(api.sessions.create.path, {
        method: api.sessions.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create session");
      return api.sessions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<CreateSessionRequest>) => {
      const url = buildUrl(api.sessions.update.path, { id });
      const res = await fetch(url, {
        method: api.sessions.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update session");
      return api.sessions.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.sessions.delete.path, { id });
      const res = await fetch(url, { method: api.sessions.delete.method });
      if (!res.ok) throw new Error("Failed to delete session");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
    },
  });
}
