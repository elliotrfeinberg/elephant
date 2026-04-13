import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import {
  getUserPlaces,
  getPlacesNear,
  createPlace,
  deletePlace,
} from "@/services/places";
import type { PlaceInput } from "@/types";
import type { LatLng } from "@/utils/geo";

export function useUserPlaces() {
  const userId = useAuthStore((s) => s.user?.uid);

  return useQuery({
    queryKey: ["places", userId],
    queryFn: () => getUserPlaces(userId!),
    enabled: !!userId,
  });
}

export function useNearbyPlaces(center: LatLng | null, radiusMeters: number) {
  const userId = useAuthStore((s) => s.user?.uid);

  return useQuery({
    queryKey: ["places", "nearby", center?.latitude, center?.longitude, radiusMeters],
    queryFn: () => getPlacesNear(userId!, center!, radiusMeters),
    enabled: !!userId && !!center,
    staleTime: 60_000, // Cache for 60s to reduce Firestore reads on map pan
  });
}

export function useCreatePlace() {
  const userId = useAuthStore((s) => s.user?.uid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PlaceInput) => createPlace(userId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places"] });
    },
  });
}

export function useDeletePlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (placeId: string) => deletePlace(placeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places"] });
    },
  });
}
