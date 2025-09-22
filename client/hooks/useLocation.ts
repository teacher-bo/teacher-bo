import { useState, useEffect, useCallback } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";
import { BoardGameCafe } from "../types";
import { useLocations } from "../providers/GlobalProvider";

interface LocationError {
  code: number;
  message: string;
}

interface UseLocationReturn {
  location: Location.LocationObject | null;
  loading: boolean;
  error: LocationError | null;
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<Location.LocationObject | null>;
  watchLocation: () => Promise<Location.LocationSubscription | null>;
  stopWatching: () => void;
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LocationError | null>(null);
  const [subscription, setSubscription] =
    useState<Location.LocationSubscription | null>(null);
  const { setCurrentLocation } = useLocations();

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== "granted") {
        setError({
          code: 1,
          message: "Location permission denied",
        });
        return false;
      }

      // For background location (optional)
      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();

      return true;
    } catch (err) {
      setError({
        code: 2,
        message: "Failed to request location permission",
      });
      return false;
    }
  }, []);

  const getCurrentLocation =
    useCallback(async (): Promise<Location.LocationObject | null> => {
      setLoading(true);
      setError(null);

      try {
        const permissionGranted = await requestPermission();
        if (!permissionGranted) {
          return null;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setLocation(currentLocation);
        setCurrentLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });

        return currentLocation;
      } catch (err) {
        setError({
          code: 3,
          message: "Failed to get current location",
        });
        return null;
      } finally {
        setLoading(false);
      }
    }, [requestPermission, setCurrentLocation]);

  const watchLocation =
    useCallback(async (): Promise<Location.LocationSubscription | null> => {
      try {
        const permissionGranted = await requestPermission();
        if (!permissionGranted) {
          return null;
        }

        const locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000, // Update every 10 seconds
            distanceInterval: 10, // Update when moved 10 meters
          },
          (newLocation) => {
            setLocation(newLocation);
            setCurrentLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            });
          }
        );

        setSubscription(locationSubscription);
        return locationSubscription;
      } catch (err) {
        setError({
          code: 4,
          message: "Failed to start location watching",
        });
        return null;
      }
    }, [requestPermission, setCurrentLocation]);

  const stopWatching = useCallback(() => {
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }
  }, [subscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  return {
    location,
    loading,
    error,
    requestPermission,
    getCurrentLocation,
    watchLocation,
    stopWatching,
  };
}

// Hook for finding nearby board game cafes
export function useNearbyVenues() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { locations, setNearbyCafes } = useLocations();
  const { getCurrentLocation } = useLocation();

  const findNearbyVenues = useCallback(
    async (radius: number = 5000): Promise<BoardGameCafe[]> => {
      setLoading(true);
      setError(null);

      try {
        // Get current location if not available
        let currentLocation = locations.current;
        if (!currentLocation) {
          const locationData = await getCurrentLocation();
          if (!locationData) {
            throw new Error("Unable to get current location");
          }
          currentLocation = {
            latitude: locationData.coords.latitude,
            longitude: locationData.coords.longitude,
          };
        }

        // Here you would typically make an API call to find nearby venues
        // For now, we'll return mock data
        const mockVenues: BoardGameCafe[] = [
          {
            id: "1",
            name: "보드게임카페 플레이타임",
            address: "서울시 강남구 테헤란로 123",
            location: {
              latitude: 37.5665,
              longitude: 126.978,
            },
            rating: 4.5,
            priceRange: 2,
            phone: "02-1234-5678",
            website: "https://playtime.co.kr",
            openingHours: [
              { day: "monday", open: "12:00", close: "24:00", isClosed: false },
              {
                day: "tuesday",
                open: "12:00",
                close: "24:00",
                isClosed: false,
              },
              {
                day: "wednesday",
                open: "12:00",
                close: "24:00",
                isClosed: false,
              },
              {
                day: "thursday",
                open: "12:00",
                close: "24:00",
                isClosed: false,
              },
              { day: "friday", open: "12:00", close: "02:00", isClosed: false },
              {
                day: "saturday",
                open: "12:00",
                close: "02:00",
                isClosed: false,
              },
              { day: "sunday", open: "12:00", close: "24:00", isClosed: false },
            ],
            gameLibrarySize: 500,
            amenities: ["WiFi", "주차장", "음료", "간식"],
            photos: ["https://example.com/photo1.jpg"],
            distance: 0.8,
          },
        ];

        setNearbyCafes(mockVenues);
        return mockVenues;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to find nearby venues";
        setError(errorMessage);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [locations.current, setNearbyCafes, getCurrentLocation]
  );

  return {
    venues: locations.nearbyCafes,
    loading,
    error,
    findNearbyVenues,
  };
}

// Hook for reverse geocoding (getting address from coordinates)
export function useReverseGeocode() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = useCallback(
    async (
      latitude: number,
      longitude: number
    ): Promise<Location.LocationGeocodedAddress | null> => {
      setLoading(true);
      setError(null);

      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (addresses.length > 0) {
          return addresses[0];
        }
        return null;
      } catch (err) {
        setError("Failed to get address from coordinates");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    reverseGeocode,
  };
}

// Hook for calculating distance between two points
export function useDistanceCalculator() {
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
          Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

  const calculateDistanceFromCurrent = useCallback(
    (
      targetLat: number,
      targetLon: number,
      currentLocation?: { latitude: number; longitude: number }
    ): number | null => {
      if (!currentLocation) {
        return null;
      }
      return calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        targetLat,
        targetLon
      );
    },
    [calculateDistance]
  );

  return {
    calculateDistance,
    calculateDistanceFromCurrent,
  };
}
