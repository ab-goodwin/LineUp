import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BUDDIES_KEY = "/api/buddies";

export interface BuddyPublicStats {
  userId: number;
  username: string;
  firstName: string;
  avatar?: string;
  totalDances: number;
  longestStreak: number;
  totalDaysDancing: number;
  currentStreak: number;
  favoriteDance: string;
  lineDanceCount: number;
  swingDanceCount: number;
  currentFavoriteSong: string | null;
}

export interface BuddyRequest {
  id: number;
  requesterId: number;
  recipientId: number;
  status: string;
  requesterUsername: string;
  requesterFirstName: string;
  requesterAvatar?: string;
}

export interface Challenge {
  id: number;
  challengerId: number;
  challengedId: number;
  startDate: string;
  durationDays: number;
  status: string;
  challengerUsername: string;
  challengerFirstName: string;
  challengedUsername: string;
  challengedFirstName: string;
  challengerStreak: number;
  challengedStreak: number;
}

export function useBuddies() {
  return useQuery<BuddyPublicStats[]>({
    queryKey: [BUDDIES_KEY],
    queryFn: async () => {
      const res = await apiFetch(BUDDIES_KEY, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch buddies");
      return res.json();
    },
  });
}

export function useBuddyRequests() {
  return useQuery<BuddyRequest[]>({
    queryKey: [BUDDIES_KEY + "/requests"],
    queryFn: async () => {
      const res = await apiFetch(BUDDIES_KEY + "/requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
  });
}

export function useSearchUsers() {
  return useMutation({
    mutationFn: async (username: string) => {
      const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(username)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Search failed");
      return res.json() as Promise<{ id: number; username: string; firstName: string }[]>;
    },
  });
}

export function useSendBuddyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recipientId: number) => {
      const res = await apiFetch(BUDDIES_KEY + "/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Request failed" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BUDDIES_KEY] });
      queryClient.invalidateQueries({ queryKey: [BUDDIES_KEY + "/requests"] });
    },
  });
}

export function useRespondToBuddyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "accept" | "decline" }) => {
      const res = await apiFetch(`${BUDDIES_KEY}/request/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to respond");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BUDDIES_KEY] });
      queryClient.invalidateQueries({ queryKey: [BUDDIES_KEY + "/requests"] });
    },
  });
}

export function useRemoveBuddy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (buddyUserId: number) => {
      const res = await apiFetch(`${BUDDIES_KEY}/${buddyUserId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove buddy");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BUDDIES_KEY] });
    },
  });
}

export function useChallenges() {
  return useQuery<Challenge[]>({
    queryKey: [BUDDIES_KEY + "/challenges"],
    queryFn: async () => {
      const res = await apiFetch(BUDDIES_KEY + "/challenges", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch challenges");
      return res.json();
    },
  });
}

export function useSendChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengedId, durationDays }: { challengedId: number; durationDays: number }) => {
      const res = await apiFetch(BUDDIES_KEY + "/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengedId, durationDays }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Challenge failed" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BUDDIES_KEY + "/challenges"] });
    },
  });
}
