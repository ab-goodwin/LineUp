import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

type ProfileUpdateData = {
  firstName?: string;
  lastName?: string;
  location?: string;
};

export function useProfile() {
  return useQuery({
    queryKey: [api.profile.get.path],
    queryFn: async () => {
      const res = await fetch(api.profile.get.path, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch profile");
      }

      return api.profile.get.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      const res = await fetch(api.profile.update.path, {
        method: api.profile.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }

      return api.profile.update.responses[200].parse(await res.json());
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.profile.get.path],
      });
    },
  });
}

export function useUpdateSuggestionsOptIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (optIn: boolean) => {
      const res = await fetch("/api/profile/suggestions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to update suggestions setting");
      }

      return res.json() as Promise<{
        ok: boolean;
        appearInSuggestions: boolean;
      }>;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.profile.get.path],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/buddies/suggested"],
      });
    },
  });
}

export function useDeleteData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type: "sessions" | "songs" | "all") => {
      const res = await fetch(api.profile.deleteData.path, {
        method: api.profile.deleteData.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to delete data");
      }

      return api.profile.deleteData.responses[200].parse(await res.json());
    },

    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useUpdateOnboardingPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dontShow: boolean) => {
      const response = await fetch(
        "/api/profile/onboarding-preference",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dontShow }),
          credentials: "include",
        },
      );

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ message: "Failed to update preference" }));

        throw new Error(
          body.message || "Failed to update onboarding preference",
        );
      }

      return response.json() as Promise<{
        ok: boolean;
        onboardingDontShow: boolean;
      }>;
    },

    onSuccess: (result) => {
      queryClient.setQueryData(
        [api.profile.get.path],
        (current: any) =>
          current
            ? {
                ...current,
                onboardingDontShow: result.onboardingDontShow,
              }
            : current,
      );

      queryClient.invalidateQueries({
        queryKey: [api.profile.get.path],
      });

      queryClient.invalidateQueries({
        queryKey: ["/api/me"],
      });
    },
  });
}