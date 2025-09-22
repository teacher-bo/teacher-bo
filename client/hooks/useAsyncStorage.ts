import { useState, useEffect, useCallback } from "react";
import { storage } from "../utils/storage";

export function useSecureStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => Promise<void>, boolean, Error | null] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load initial value from storage
  useEffect(() => {
    const loadStoredValue = async () => {
      try {
        setLoading(true);
        setError(null);
        const item = await storage.getItem<T>(key);
        if (item !== null) {
          setStoredValue(item);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to load from storage")
        );
      } finally {
        setLoading(false);
      }
    };

    loadStoredValue();
  }, [key]);

  // Function to update both state and storage
  const setValue = useCallback(
    async (value: T) => {
      try {
        setError(null);
        setStoredValue(value);
        await storage.setItem(key, value);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to save to storage")
        );
        // Revert the state change on error
        const item = await storage.getItem<T>(key);
        if (item !== null) {
          setStoredValue(item);
        } else {
          setStoredValue(initialValue);
        }
      }
    },
    [key, initialValue]
  );

  return [storedValue, setValue, loading, error];
}

// Keep the old name for backward compatibility
export const useAsyncStorage = useSecureStorage;
