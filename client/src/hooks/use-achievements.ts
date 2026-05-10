import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { AchievementStatus } from "@shared/achievements";

export type { AchievementStatus };

export function useAchievements() {
  return useQuery<AchievementStatus[]>({
    queryKey: ["/api/achievements"],
  });
}

export function useUnseenAchievements() {
  return useQuery<{ count: number; ids: string[] }>({
    queryKey: ["/api/achievements/unseen"],
    refetchInterval: 120000,
  });
}

export function useMarkAchievementsSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest("PUT", "/api/achievements/seen"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/achievements"] });
      qc.invalidateQueries({ queryKey: ["/api/achievements/unseen"] });
    },
  });
}
