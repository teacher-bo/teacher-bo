import * as SecureStore from "expo-secure-store";

// Storage keys
export const STORAGE_KEYS = {
  USER_DATA: "@board_game_assistant:user_data",
  THEME_PREFERENCE: "@board_game_assistant:theme_preference",
  FAVORITES: "@board_game_assistant:favorites",
  RECENTLY_PLAYED: "@board_game_assistant:recently_played",
  COLLECTIONS: "@board_game_assistant:collections",
  ONBOARDING_COMPLETED: "@board_game_assistant:onboarding_completed",
} as const;

// Generic storage functions using Expo SecureStore
export const storage = {
  // Get item from storage
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting item ${key} from storage:`, error);
      return null;
    }
  },

  // Set item in storage
  async setItem<T>(key: string, value: T): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting item ${key} in storage:`, error);
      return false;
    }
  },

  // Remove item from storage
  async removeItem(key: string): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch (error) {
      console.error(`Error removing item ${key} from storage:`, error);
      return false;
    }
  },

  // Clear all storage (note: SecureStore doesn't have a clear all method, so we'll clear individual items)
  async clear(): Promise<boolean> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await Promise.all(keys.map((key) => SecureStore.deleteItemAsync(key)));
      return true;
    } catch (error) {
      console.error("Error clearing storage:", error);
      return false;
    }
  },

  // Get multiple items
  async getMultiple(keys: string[]): Promise<Record<string, any>> {
    try {
      const results = await Promise.all(
        keys.map(async (key) => {
          const value = await SecureStore.getItemAsync(key);
          return [key, value ? JSON.parse(value) : null];
        })
      );

      const result: Record<string, any> = {};
      results.forEach(([key, value]) => {
        if (value !== null) {
          result[key] = value;
        }
      });

      return result;
    } catch (error) {
      console.error("Error getting multiple items from storage:", error);
      return {};
    }
  },

  // Set multiple items
  async setMultiple(keyValuePairs: Array<[string, any]>): Promise<boolean> {
    try {
      await Promise.all(
        keyValuePairs.map(([key, value]) =>
          SecureStore.setItemAsync(key, JSON.stringify(value))
        )
      );
      return true;
    } catch (error) {
      console.error("Error setting multiple items in storage:", error);
      return false;
    }
  },
};

// Specific storage functions for the app
export const userStorage = {
  async getUserData() {
    return await storage.getItem(STORAGE_KEYS.USER_DATA);
  },

  async setUserData(userData: any) {
    return await storage.setItem(STORAGE_KEYS.USER_DATA, userData);
  },

  async getThemePreference(): Promise<"light" | "dark" | "auto" | null> {
    return await storage.getItem(STORAGE_KEYS.THEME_PREFERENCE);
  },

  async setThemePreference(theme: "light" | "dark" | "auto") {
    return await storage.setItem(STORAGE_KEYS.THEME_PREFERENCE, theme);
  },

  async isOnboardingCompleted(): Promise<boolean> {
    const completed = await storage.getItem<boolean>(
      STORAGE_KEYS.ONBOARDING_COMPLETED
    );
    return completed || false;
  },

  async setOnboardingCompleted(completed: boolean = true) {
    return await storage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, completed);
  },
};

export const gameStorage = {
  async getFavorites(): Promise<string[]> {
    const favorites = await storage.getItem<string[]>(STORAGE_KEYS.FAVORITES);
    return favorites || [];
  },

  async setFavorites(favorites: string[]) {
    return await storage.setItem(STORAGE_KEYS.FAVORITES, favorites);
  },

  async getRecentlyPlayed(): Promise<string[]> {
    const recentlyPlayed = await storage.getItem<string[]>(
      STORAGE_KEYS.RECENTLY_PLAYED
    );
    return recentlyPlayed || [];
  },

  async setRecentlyPlayed(games: string[]) {
    return await storage.setItem(STORAGE_KEYS.RECENTLY_PLAYED, games);
  },

  async getCollections(): Promise<any[]> {
    const collections = await storage.getItem<any[]>(STORAGE_KEYS.COLLECTIONS);
    return collections || [];
  },

  async setCollections(collections: any[]) {
    return await storage.setItem(STORAGE_KEYS.COLLECTIONS, collections);
  },
};
