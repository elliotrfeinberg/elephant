import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import {
  sharePlace,
  unsharePlace,
  getPlaceShares,
  getPendingInvites,
  acceptInvite,
  declineInvite,
} from "@/services/sharing";

export function usePlaceShares(placeId: string) {
  return useQuery({
    queryKey: ["shares", placeId],
    queryFn: () => getPlaceShares(placeId),
    enabled: !!placeId,
  });
}

export function usePendingInvites() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["invites", "pending", user?.uid],
    queryFn: () => getPendingInvites(user!.uid, user!.email!),
    enabled: !!user?.uid && !!user?.email,
  });
}

export function useSharePlace(placeId: string, placeName: string) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (toEmail: string) =>
      sharePlace(
        placeId,
        placeName,
        user!.uid,
        user!.displayName ?? "Someone",
        toEmail
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", placeId] });
      queryClient.invalidateQueries({ queryKey: ["place", placeId] });
    },
  });
}

export function useUnsharePlace(placeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => unsharePlace(placeId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", placeId] });
      queryClient.invalidateQueries({ queryKey: ["place", placeId] });
    },
  });
}

export function useAcceptInvite() {
  const userId = useAuthStore((s) => s.user?.uid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) => acceptInvite(inviteId, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      queryClient.invalidateQueries({ queryKey: ["places"] });
    },
  });
}

export function useDeclineInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) => declineInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });
}
