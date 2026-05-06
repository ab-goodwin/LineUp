import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const KEY = "/api/danceoffs";

export interface DanceOffParticipantResult {
  userId: number;
  username: string;
  firstName: string;
  avatar?: string;
  finalDanceCount: number | null;
  liveDanceCount?: number;
}

export interface DanceOffResult {
  id: number;
  type: "h2h" | "showdown";
  title: string;
  durationHours: number;
  startedAt: string;
  joinCode: string | null;
  status: "active" | "completed";
  creatorId: number;
  challengedId: number | null;
  participants: DanceOffParticipantResult[];
  msRemaining: number;
}

export function useDanceOffs() {
  return useQuery<DanceOffResult[]>({
    queryKey: [KEY],
    queryFn: async () => {
      const res = await fetch(KEY, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dance-offs");
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useCreateDanceOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      type: "h2h" | "showdown";
      title: string;
      durationHours: number;
      challengedId?: number;
    }) => {
      const res = await fetch(KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(err.message);
      }
      return res.json() as Promise<{ id: number; joinCode: string | null }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useJoinDanceOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (joinCode: string) => {
      const res = await fetch(KEY + "/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
