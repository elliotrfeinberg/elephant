import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import ClusteredMapView from "react-native-map-clustering";
import { Marker, Callout, Region } from "react-native-maps";
import { useRouter } from "expo-router";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useNearbyPlaces } from "@/hooks/usePlaces";
import { useAuthStore } from "@/stores/authStore";
import { CATEGORY_CONFIG } from "@/constants/categories";
import type { Place } from "@/types";

const DEFAULT_DELTA = { latitudeDelta: 0.02, longitudeDelta: 0.02 };
const MAP_QUERY_RADIUS = 5000;

export default function MapScreen() {
  const { location, isLoading: locationLoading } = useCurrentLocation();
  const userId = useAuthStore((s) => s.user?.uid);
  const router = useRouter();
  const mapRef = useRef<any>(null);

  const [mapCenter, setMapCenter] = useState(location);
  const center = mapCenter ?? location;

  const { data: places, isLoading: placesLoading } = useNearbyPlaces(
    center,
    MAP_QUERY_RADIUS
  );

  const handleRegionChangeComplete = useCallback((region: Region) => {
    setMapCenter({
      latitude: region.latitude,
      longitude: region.longitude,
    });
  }, []);

  function handleRecenter() {
    if (!location || !mapRef.current) return;
    mapRef.current.animateToRegion({
      ...location,
      ...DEFAULT_DELTA,
    });
  }

  if (locationLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2563eb" size="large" />
        <Text className="text-sm text-gray-500 mt-3">
          Getting your location...
        </Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-5xl mb-4">📍</Text>
        <Text className="text-base text-gray-500 text-center">
          Location access is needed to show the map. Please enable it in your
          device settings.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ClusteredMapView
        ref={mapRef}
        className="flex-1"
        initialRegion={{
          ...location,
          ...DEFAULT_DELTA,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={handleRegionChangeComplete}
        provider={Platform.OS === "android" ? "google" : undefined}
        clusterColor="#2563eb"
        clusterTextColor="#fff"
        clusterFontFamily="System"
        radius={50}
        minZoomLevel={0}
        maxZoomLevel={20}
        extent={512}
      >
        {(places ?? []).map((place) => (
          <PlaceMarker
            key={place.placeId}
            place={place}
            isSharedToMe={place.userId !== userId}
            onCalloutPress={() => router.push(`/place/${place.placeId}`)}
          />
        ))}
      </ClusteredMapView>

      {/* Recenter button */}
      <TouchableOpacity
        onPress={handleRecenter}
        className="absolute bottom-6 right-6 bg-white w-12 h-12 rounded-full items-center justify-center shadow-md"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 3,
          elevation: 3,
        }}
      >
        <Text className="text-lg">📍</Text>
      </TouchableOpacity>

      {/* Places loading indicator */}
      {placesLoading && (
        <View className="absolute top-4 self-center bg-white rounded-full px-3 py-1 shadow-sm">
          <Text className="text-xs text-gray-500">Loading places...</Text>
        </View>
      )}
    </View>
  );
}

function PlaceMarker({
  place,
  isSharedToMe,
  onCalloutPress,
}: {
  place: Place;
  isSharedToMe?: boolean;
  onCalloutPress: () => void;
}) {
  const cat = CATEGORY_CONFIG[place.category];

  return (
    <Marker
      coordinate={{
        latitude: place.location.latitude,
        longitude: place.location.longitude,
      }}
      title={place.name}
    >
      <View className="items-center">
        <View
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{
            backgroundColor: cat.color,
            borderWidth: isSharedToMe ? 2 : 0,
            borderColor: "#3b82f6",
            borderStyle: isSharedToMe ? "dashed" : "solid",
          }}
        >
          <Text className="text-sm">{cat.icon}</Text>
        </View>
      </View>
      <Callout onPress={onCalloutPress}>
        <View style={{ minWidth: 150 }}>
          <Text style={{ fontWeight: "600", fontSize: 14 }}>{place.name}</Text>
          <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
            {place.noteCount} note{place.noteCount !== 1 ? "s" : ""} — Tap to
            view
          </Text>
        </View>
      </Callout>
    </Marker>
  );
}
