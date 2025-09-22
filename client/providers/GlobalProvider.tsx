import React, {
  createContext,
  useContext,
  ReactNode,
  useReducer,
  useEffect,
} from "react";
import { useColorScheme } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { storage } from "../utils/storage";
import {
  User,
  BoardGame,
  GameSession,
  GameCollection,
  AppState,
  SearchFilters,
  BoardGameCafe,
  Notification,
  UserPreferences,
  UserStats,
} from "../types";

// Global State Type
interface GlobalState {
  user: User;
  app: AppState;
  boardGames: {
    favorites: string[];
    recentlyPlayed: string[];
    collections: GameCollection[];
    searchHistory: string[];
    currentFilters: SearchFilters;
    wishlist: string[];
  };
  sessions: {
    active?: GameSession;
    history: GameSession[];
  };
  locations: {
    current?: { latitude: number; longitude: number };
    nearbyCafes: BoardGameCafe[];
    favoriteVenues: string[];
  };
  notifications: {
    unreadCount: number;
    items: Notification[];
  };
  cache: {
    games: { [id: string]: BoardGame };
    lastUpdated: number;
  };
}

// Initial State
const initialState: GlobalState = {
  user: {
    preferences: {
      theme: "auto",
      language: "ko",
      notifications: true,
      soundEnabled: true,
      hapticEnabled: true,
      autoSave: true,
      difficulty: "intermediate",
    },
    stats: {
      gamesPlayed: 0,
      totalPlayTime: 0,
      favoriteGenres: [],
      winRate: 0,
      averageRating: 0,
    },
  },
  app: {
    isLoading: false,
    networkStatus: "online",
    isFirstLaunch: true,
    currentVersion: "1.0.0",
    needsUpdate: false,
  },
  boardGames: {
    favorites: [],
    recentlyPlayed: [],
    collections: [],
    searchHistory: [],
    currentFilters: {},
    wishlist: [],
  },
  sessions: {
    history: [],
  },
  locations: {
    nearbyCafes: [],
    favoriteVenues: [],
  },
  notifications: {
    unreadCount: 0,
    items: [],
  },
  cache: {
    games: {},
    lastUpdated: 0,
  },
};

// Action Types
type GlobalAction =
  // User Actions
  | { type: "SET_USER"; payload: Partial<User> }
  | { type: "UPDATE_PREFERENCES"; payload: Partial<UserPreferences> }
  | { type: "UPDATE_STATS"; payload: Partial<UserStats> }
  | { type: "RESET_USER" }

  // App Actions
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | undefined }
  | { type: "SET_NETWORK_STATUS"; payload: "online" | "offline" }
  | { type: "SET_FIRST_LAUNCH"; payload: boolean }
  | { type: "SET_VERSION"; payload: string }
  | { type: "SET_NEEDS_UPDATE"; payload: boolean }

  // Board Games Actions
  | { type: "ADD_FAVORITE"; payload: string }
  | { type: "REMOVE_FAVORITE"; payload: string }
  | { type: "ADD_RECENTLY_PLAYED"; payload: string }
  | { type: "ADD_TO_WISHLIST"; payload: string }
  | { type: "REMOVE_FROM_WISHLIST"; payload: string }
  | { type: "SET_COLLECTIONS"; payload: GameCollection[] }
  | { type: "ADD_COLLECTION"; payload: GameCollection }
  | {
      type: "UPDATE_COLLECTION";
      payload: { id: string; updates: Partial<GameCollection> };
    }
  | { type: "DELETE_COLLECTION"; payload: string }
  | { type: "ADD_SEARCH_TERM"; payload: string }
  | { type: "CLEAR_SEARCH_HISTORY" }
  | { type: "SET_FILTERS"; payload: SearchFilters }
  | { type: "CLEAR_FILTERS" }

  // Session Actions
  | { type: "START_SESSION"; payload: GameSession }
  | {
      type: "END_SESSION";
      payload: {
        endTime: Date;
        winner?: string;
        scores?: { [playerId: string]: number };
      };
    }
  | { type: "UPDATE_SESSION"; payload: Partial<GameSession> }
  | { type: "ADD_SESSION_TO_HISTORY"; payload: GameSession }

  // Location Actions
  | {
      type: "SET_CURRENT_LOCATION";
      payload: { latitude: number; longitude: number };
    }
  | { type: "SET_NEARBY_CAFES"; payload: BoardGameCafe[] }
  | { type: "ADD_FAVORITE_VENUE"; payload: string }
  | { type: "REMOVE_FAVORITE_VENUE"; payload: string }

  // Notification Actions
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "MARK_NOTIFICATION_READ"; payload: string }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "DELETE_NOTIFICATION"; payload: string }
  | { type: "CLEAR_NOTIFICATIONS" }

  // Cache Actions
  | { type: "CACHE_GAME"; payload: BoardGame }
  | { type: "CACHE_GAMES"; payload: BoardGame[] }
  | { type: "CLEAR_CACHE" }
  | { type: "UPDATE_CACHE_TIMESTAMP"; payload: number };

// Reducer
function globalReducer(state: GlobalState, action: GlobalAction): GlobalState {
  switch (action.type) {
    // User Actions
    case "SET_USER":
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    case "UPDATE_PREFERENCES":
      return {
        ...state,
        user: {
          ...state.user,
          preferences: { ...state.user.preferences, ...action.payload },
        },
      };

    case "UPDATE_STATS":
      return {
        ...state,
        user: {
          ...state.user,
          stats: { ...state.user.stats, ...action.payload },
        },
      };

    case "RESET_USER":
      return {
        ...state,
        user: initialState.user,
      };

    // App Actions
    case "SET_LOADING":
      return {
        ...state,
        app: { ...state.app, isLoading: action.payload },
      };

    case "SET_ERROR":
      return {
        ...state,
        app: { ...state.app, error: action.payload },
      };

    case "SET_NETWORK_STATUS":
      return {
        ...state,
        app: { ...state.app, networkStatus: action.payload },
      };

    case "SET_FIRST_LAUNCH":
      return {
        ...state,
        app: { ...state.app, isFirstLaunch: action.payload },
      };

    case "SET_VERSION":
      return {
        ...state,
        app: { ...state.app, currentVersion: action.payload },
      };

    case "SET_NEEDS_UPDATE":
      return {
        ...state,
        app: { ...state.app, needsUpdate: action.payload },
      };

    // Board Games Actions
    case "ADD_FAVORITE":
      if (state.boardGames.favorites.includes(action.payload)) return state;
      return {
        ...state,
        boardGames: {
          ...state.boardGames,
          favorites: [...state.boardGames.favorites, action.payload],
        },
      };

    case "REMOVE_FAVORITE":
      return {
        ...state,
        boardGames: {
          ...state.boardGames,
          favorites: state.boardGames.favorites.filter(
            (id) => id !== action.payload
          ),
        },
      };

    case "ADD_RECENTLY_PLAYED":
      const recentlyPlayed = [
        action.payload,
        ...state.boardGames.recentlyPlayed.filter(
          (id) => id !== action.payload
        ),
      ].slice(0, 20); // Keep only last 20 games
      return {
        ...state,
        boardGames: {
          ...state.boardGames,
          recentlyPlayed,
        },
      };

    case "ADD_TO_WISHLIST":
      if (state.boardGames.wishlist.includes(action.payload)) return state;
      return {
        ...state,
        boardGames: {
          ...state.boardGames,
          wishlist: [...state.boardGames.wishlist, action.payload],
        },
      };

    case "REMOVE_FROM_WISHLIST":
      return {
        ...state,
        boardGames: {
          ...state.boardGames,
          wishlist: state.boardGames.wishlist.filter(
            (id) => id !== action.payload
          ),
        },
      };

    case "SET_COLLECTIONS":
      return {
        ...state,
        boardGames: { ...state.boardGames, collections: action.payload },
      };

    case "ADD_COLLECTION":
      return {
        ...state,
        boardGames: {
          ...state.boardGames,
          collections: [...state.boardGames.collections, action.payload],
        },
      };

    case "UPDATE_COLLECTION":
      return {
        ...state,
        boardGames: {
          ...state.boardGames,
          collections: state.boardGames.collections.map((collection) =>
            collection.id === action.payload.id
              ? {
                  ...collection,
                  ...action.payload.updates,
                  updatedAt: new Date(),
                }
              : collection
          ),
        },
      };

    case "DELETE_COLLECTION":
      return {
        ...state,
        boardGames: {
          ...state.boardGames,
          collections: state.boardGames.collections.filter(
            (collection) => collection.id !== action.payload
          ),
        },
      };

    case "ADD_SEARCH_TERM":
      const searchHistory = [
        action.payload,
        ...state.boardGames.searchHistory.filter(
          (term) => term !== action.payload
        ),
      ].slice(0, 10); // Keep only last 10 searches
      return {
        ...state,
        boardGames: { ...state.boardGames, searchHistory },
      };

    case "CLEAR_SEARCH_HISTORY":
      return {
        ...state,
        boardGames: { ...state.boardGames, searchHistory: [] },
      };

    case "SET_FILTERS":
      return {
        ...state,
        boardGames: { ...state.boardGames, currentFilters: action.payload },
      };

    case "CLEAR_FILTERS":
      return {
        ...state,
        boardGames: { ...state.boardGames, currentFilters: {} },
      };

    // Session Actions
    case "START_SESSION":
      return {
        ...state,
        sessions: { ...state.sessions, active: action.payload },
      };

    case "END_SESSION":
      if (!state.sessions.active) return state;
      const endedSession = {
        ...state.sessions.active,
        ...action.payload,
        duration:
          action.payload.endTime.getTime() -
          state.sessions.active.startTime.getTime(),
      };
      return {
        ...state,
        sessions: {
          active: undefined,
          history: [endedSession, ...state.sessions.history].slice(0, 100), // Keep last 100 sessions
        },
      };

    case "UPDATE_SESSION":
      if (!state.sessions.active) return state;
      return {
        ...state,
        sessions: {
          ...state.sessions,
          active: { ...state.sessions.active, ...action.payload },
        },
      };

    case "ADD_SESSION_TO_HISTORY":
      return {
        ...state,
        sessions: {
          ...state.sessions,
          history: [action.payload, ...state.sessions.history].slice(0, 100),
        },
      };

    // Location Actions
    case "SET_CURRENT_LOCATION":
      return {
        ...state,
        locations: { ...state.locations, current: action.payload },
      };

    case "SET_NEARBY_CAFES":
      return {
        ...state,
        locations: { ...state.locations, nearbyCafes: action.payload },
      };

    case "ADD_FAVORITE_VENUE":
      if (state.locations.favoriteVenues.includes(action.payload)) return state;
      return {
        ...state,
        locations: {
          ...state.locations,
          favoriteVenues: [...state.locations.favoriteVenues, action.payload],
        },
      };

    case "REMOVE_FAVORITE_VENUE":
      return {
        ...state,
        locations: {
          ...state.locations,
          favoriteVenues: state.locations.favoriteVenues.filter(
            (id) => id !== action.payload
          ),
        },
      };

    // Notification Actions
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: {
          items: [action.payload, ...state.notifications.items],
          unreadCount: state.notifications.unreadCount + 1,
        },
      };

    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: {
          ...state.notifications,
          items: state.notifications.items.map((notification) =>
            notification.id === action.payload && !notification.isRead
              ? { ...notification, isRead: true }
              : notification
          ),
          unreadCount: Math.max(
            0,
            state.notifications.unreadCount -
              (state.notifications.items.find(
                (n) => n.id === action.payload && !n.isRead
              )
                ? 1
                : 0)
          ),
        },
      };

    case "MARK_ALL_NOTIFICATIONS_READ":
      return {
        ...state,
        notifications: {
          ...state.notifications,
          items: state.notifications.items.map((notification) => ({
            ...notification,
            isRead: true,
          })),
          unreadCount: 0,
        },
      };

    case "DELETE_NOTIFICATION":
      const notificationToDelete = state.notifications.items.find(
        (n) => n.id === action.payload
      );
      return {
        ...state,
        notifications: {
          items: state.notifications.items.filter(
            (n) => n.id !== action.payload
          ),
          unreadCount: Math.max(
            0,
            state.notifications.unreadCount -
              (notificationToDelete && !notificationToDelete.isRead ? 1 : 0)
          ),
        },
      };

    case "CLEAR_NOTIFICATIONS":
      return {
        ...state,
        notifications: {
          items: [],
          unreadCount: 0,
        },
      };

    // Cache Actions
    case "CACHE_GAME":
      return {
        ...state,
        cache: {
          ...state.cache,
          games: { ...state.cache.games, [action.payload.id]: action.payload },
          lastUpdated: Date.now(),
        },
      };

    case "CACHE_GAMES":
      const gameCache = { ...state.cache.games };
      action.payload.forEach((game) => {
        gameCache[game.id] = game;
      });
      return {
        ...state,
        cache: {
          games: gameCache,
          lastUpdated: Date.now(),
        },
      };

    case "CLEAR_CACHE":
      return {
        ...state,
        cache: {
          games: {},
          lastUpdated: 0,
        },
      };

    case "UPDATE_CACHE_TIMESTAMP":
      return {
        ...state,
        cache: { ...state.cache, lastUpdated: action.payload },
      };

    default:
      return state;
  }
}

// Context
interface GlobalContextType {
  state: GlobalState;
  dispatch: React.Dispatch<GlobalAction>;

  // Helper functions - User
  setUser: (user: Partial<User>) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  updateStats: (stats: Partial<UserStats>) => void;
  resetUser: () => void;

  // Helper functions - App
  setLoading: (loading: boolean) => void;
  setError: (error: string | undefined) => void;
  setNetworkStatus: (status: "online" | "offline") => void;

  // Helper functions - Board Games
  toggleFavorite: (gameId: string) => void;
  addRecentlyPlayed: (gameId: string) => void;
  toggleWishlist: (gameId: string) => void;
  addCollection: (collection: GameCollection) => void;
  updateCollection: (id: string, updates: Partial<GameCollection>) => void;
  deleteCollection: (id: string) => void;
  addSearchTerm: (term: string) => void;
  clearSearchHistory: () => void;
  setFilters: (filters: SearchFilters) => void;
  clearFilters: () => void;

  // Helper functions - Sessions
  startSession: (session: GameSession) => void;
  endSession: (
    endTime: Date,
    winner?: string,
    scores?: { [playerId: string]: number }
  ) => void;
  updateSession: (updates: Partial<GameSession>) => void;

  // Helper functions - Locations
  setCurrentLocation: (location: {
    latitude: number;
    longitude: number;
  }) => void;
  setNearbyCafes: (cafes: BoardGameCafe[]) => void;
  toggleFavoriteVenue: (venueId: string) => void;

  // Helper functions - Notifications
  addNotification: (
    notification: Omit<Notification, "id" | "createdAt" | "isRead">
  ) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;

  // Helper functions - Cache
  cacheGame: (game: BoardGame) => void;
  cacheGames: (games: BoardGame[]) => void;
  clearCache: () => void;
  getCachedGame: (id: string) => BoardGame | undefined;

  // Computed values
  getCurrentTheme: () => "light" | "dark";
  isGameFavorited: (gameId: string) => boolean;
  isGameInWishlist: (gameId: string) => boolean;
  isVenueFavorited: (venueId: string) => boolean;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  USER: "user_data",
  FAVORITES: "favorite_games",
  RECENTLY_PLAYED: "recently_played_games",
  COLLECTIONS: "game_collections",
  WISHLIST: "wishlist",
  SEARCH_HISTORY: "search_history",
  FAVORITE_VENUES: "favorite_venues",
  PREFERENCES: "user_preferences",
  SESSION_HISTORY: "session_history",
  NOTIFICATIONS: "notifications",
} as const;

// Provider Component
interface GlobalProviderProps {
  children: ReactNode;
}

export function GlobalProvider({ children }: GlobalProviderProps) {
  const [state, dispatch] = useReducer(globalReducer, initialState);
  const systemColorScheme = useColorScheme();

  // Load data from storage on app start
  useEffect(() => {
    loadDataFromStorage();
    setupNetworkListener();
    return () => {
      // Cleanup network listener
    };
  }, []);

  // Save data to storage when state changes
  useEffect(() => {
    saveDataToStorage();
  }, [state.user, state.boardGames, state.notifications]);

  const loadDataFromStorage = async () => {
    try {
      const [
        userData,
        favorites,
        recentlyPlayed,
        collections,
        wishlist,
        searchHistory,
        favoriteVenues,
        sessionHistory,
        notifications,
      ] = await Promise.all([
        storage.getItem<User>(STORAGE_KEYS.USER),
        storage.getItem<string[]>(STORAGE_KEYS.FAVORITES),
        storage.getItem<string[]>(STORAGE_KEYS.RECENTLY_PLAYED),
        storage.getItem<GameCollection[]>(STORAGE_KEYS.COLLECTIONS),
        storage.getItem<string[]>(STORAGE_KEYS.WISHLIST),
        storage.getItem<string[]>(STORAGE_KEYS.SEARCH_HISTORY),
        storage.getItem<string[]>(STORAGE_KEYS.FAVORITE_VENUES),
        storage.getItem<GameSession[]>(STORAGE_KEYS.SESSION_HISTORY),
        storage.getItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS),
      ]);

      if (userData) {
        dispatch({ type: "SET_USER", payload: userData });
      }

      if (favorites) {
        favorites.forEach((id: string) => {
          dispatch({ type: "ADD_FAVORITE", payload: id });
        });
      }

      if (recentlyPlayed) {
        recentlyPlayed.forEach((id: string) => {
          dispatch({ type: "ADD_RECENTLY_PLAYED", payload: id });
        });
      }

      if (collections) {
        dispatch({ type: "SET_COLLECTIONS", payload: collections });
      }

      if (wishlist) {
        wishlist.forEach((id: string) => {
          dispatch({ type: "ADD_TO_WISHLIST", payload: id });
        });
      }

      if (searchHistory) {
        searchHistory.forEach((term: string) => {
          dispatch({ type: "ADD_SEARCH_TERM", payload: term });
        });
      }

      if (favoriteVenues) {
        favoriteVenues.forEach((id: string) => {
          dispatch({ type: "ADD_FAVORITE_VENUE", payload: id });
        });
      }

      if (sessionHistory) {
        sessionHistory.forEach((session: GameSession) => {
          dispatch({ type: "ADD_SESSION_TO_HISTORY", payload: session });
        });
      }

      if (notifications) {
        notifications.forEach((notification: Notification) => {
          dispatch({ type: "ADD_NOTIFICATION", payload: notification });
        });
      }

      dispatch({ type: "SET_FIRST_LAUNCH", payload: false });
    } catch (error) {
      console.error("Error loading data from storage:", error);
    }
  };

  const saveDataToStorage = async () => {
    try {
      await Promise.all([
        storage.setItem(STORAGE_KEYS.USER, state.user),
        storage.setItem(STORAGE_KEYS.FAVORITES, state.boardGames.favorites),
        storage.setItem(
          STORAGE_KEYS.RECENTLY_PLAYED,
          state.boardGames.recentlyPlayed
        ),
        storage.setItem(STORAGE_KEYS.COLLECTIONS, state.boardGames.collections),
        storage.setItem(STORAGE_KEYS.WISHLIST, state.boardGames.wishlist),
        storage.setItem(
          STORAGE_KEYS.SEARCH_HISTORY,
          state.boardGames.searchHistory
        ),
        storage.setItem(
          STORAGE_KEYS.FAVORITE_VENUES,
          state.locations.favoriteVenues
        ),
        storage.setItem(STORAGE_KEYS.SESSION_HISTORY, state.sessions.history),
        storage.setItem(STORAGE_KEYS.NOTIFICATIONS, state.notifications.items),
      ]);
    } catch (error) {
      console.error("Error saving data to storage:", error);
    }
  };

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener((netInfoState) => {
      dispatch({
        type: "SET_NETWORK_STATUS",
        payload: netInfoState.isConnected ? "online" : "offline",
      });
    });
    return unsubscribe;
  };

  // Helper functions - User
  const setUser = (user: Partial<User>) => {
    dispatch({ type: "SET_USER", payload: user });
  };

  const updatePreferences = (preferences: Partial<UserPreferences>) => {
    dispatch({ type: "UPDATE_PREFERENCES", payload: preferences });
  };

  const updateStats = (stats: Partial<UserStats>) => {
    dispatch({ type: "UPDATE_STATS", payload: stats });
  };

  const resetUser = () => {
    dispatch({ type: "RESET_USER" });
  };

  // Helper functions - App
  const setLoading = (loading: boolean) => {
    dispatch({ type: "SET_LOADING", payload: loading });
  };

  const setError = (error: string | undefined) => {
    dispatch({ type: "SET_ERROR", payload: error });
  };

  const setNetworkStatus = (status: "online" | "offline") => {
    dispatch({ type: "SET_NETWORK_STATUS", payload: status });
  };

  // Helper functions - Board Games
  const toggleFavorite = (gameId: string) => {
    if (state.boardGames.favorites.includes(gameId)) {
      dispatch({ type: "REMOVE_FAVORITE", payload: gameId });
    } else {
      dispatch({ type: "ADD_FAVORITE", payload: gameId });
    }
  };

  const addRecentlyPlayed = (gameId: string) => {
    dispatch({ type: "ADD_RECENTLY_PLAYED", payload: gameId });
  };

  const toggleWishlist = (gameId: string) => {
    if (state.boardGames.wishlist.includes(gameId)) {
      dispatch({ type: "REMOVE_FROM_WISHLIST", payload: gameId });
    } else {
      dispatch({ type: "ADD_TO_WISHLIST", payload: gameId });
    }
  };

  const addCollection = (collection: GameCollection) => {
    dispatch({ type: "ADD_COLLECTION", payload: collection });
  };

  const updateCollection = (id: string, updates: Partial<GameCollection>) => {
    dispatch({ type: "UPDATE_COLLECTION", payload: { id, updates } });
  };

  const deleteCollection = (id: string) => {
    dispatch({ type: "DELETE_COLLECTION", payload: id });
  };

  const addSearchTerm = (term: string) => {
    dispatch({ type: "ADD_SEARCH_TERM", payload: term });
  };

  const clearSearchHistory = () => {
    dispatch({ type: "CLEAR_SEARCH_HISTORY" });
  };

  const setFilters = (filters: SearchFilters) => {
    dispatch({ type: "SET_FILTERS", payload: filters });
  };

  const clearFilters = () => {
    dispatch({ type: "CLEAR_FILTERS" });
  };

  // Helper functions - Sessions
  const startSession = (session: GameSession) => {
    dispatch({ type: "START_SESSION", payload: session });
  };

  const endSession = (
    endTime: Date,
    winner?: string,
    scores?: { [playerId: string]: number }
  ) => {
    dispatch({ type: "END_SESSION", payload: { endTime, winner, scores } });
  };

  const updateSession = (updates: Partial<GameSession>) => {
    dispatch({ type: "UPDATE_SESSION", payload: updates });
  };

  // Helper functions - Locations
  const setCurrentLocation = (location: {
    latitude: number;
    longitude: number;
  }) => {
    dispatch({ type: "SET_CURRENT_LOCATION", payload: location });
  };

  const setNearbyCafes = (cafes: BoardGameCafe[]) => {
    dispatch({ type: "SET_NEARBY_CAFES", payload: cafes });
  };

  const toggleFavoriteVenue = (venueId: string) => {
    if (state.locations.favoriteVenues.includes(venueId)) {
      dispatch({ type: "REMOVE_FAVORITE_VENUE", payload: venueId });
    } else {
      dispatch({ type: "ADD_FAVORITE_VENUE", payload: venueId });
    }
  };

  // Helper functions - Notifications
  const addNotification = (
    notification: Omit<Notification, "id" | "createdAt" | "isRead">
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date(),
      isRead: false,
    };
    dispatch({ type: "ADD_NOTIFICATION", payload: newNotification });
  };

  const markNotificationRead = (id: string) => {
    dispatch({ type: "MARK_NOTIFICATION_READ", payload: id });
  };

  const markAllNotificationsRead = () => {
    dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" });
  };

  const deleteNotification = (id: string) => {
    dispatch({ type: "DELETE_NOTIFICATION", payload: id });
  };

  const clearNotifications = () => {
    dispatch({ type: "CLEAR_NOTIFICATIONS" });
  };

  // Helper functions - Cache
  const cacheGame = (game: BoardGame) => {
    dispatch({ type: "CACHE_GAME", payload: game });
  };

  const cacheGames = (games: BoardGame[]) => {
    dispatch({ type: "CACHE_GAMES", payload: games });
  };

  const clearCache = () => {
    dispatch({ type: "CLEAR_CACHE" });
  };

  const getCachedGame = (id: string): BoardGame | undefined => {
    return state.cache.games[id];
  };

  // Computed values
  const getCurrentTheme = (): "light" | "dark" => {
    const theme = state.user.preferences?.theme || "auto";
    if (theme === "auto") {
      return systemColorScheme || "light";
    }
    return theme;
  };

  const isGameFavorited = (gameId: string): boolean => {
    return state.boardGames.favorites.includes(gameId);
  };

  const isGameInWishlist = (gameId: string): boolean => {
    return state.boardGames.wishlist.includes(gameId);
  };

  const isVenueFavorited = (venueId: string): boolean => {
    return state.locations.favoriteVenues.includes(venueId);
  };

  const contextValue: GlobalContextType = {
    state,
    dispatch,
    // User helpers
    setUser,
    updatePreferences,
    updateStats,
    resetUser,
    // App helpers
    setLoading,
    setError,
    setNetworkStatus,
    // Board Games helpers
    toggleFavorite,
    addRecentlyPlayed,
    toggleWishlist,
    addCollection,
    updateCollection,
    deleteCollection,
    addSearchTerm,
    clearSearchHistory,
    setFilters,
    clearFilters,
    // Sessions helpers
    startSession,
    endSession,
    updateSession,
    // Locations helpers
    setCurrentLocation,
    setNearbyCafes,
    toggleFavoriteVenue,
    // Notifications helpers
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearNotifications,
    // Cache helpers
    cacheGame,
    cacheGames,
    clearCache,
    getCachedGame,
    // Computed values
    getCurrentTheme,
    isGameFavorited,
    isGameInWishlist,
    isVenueFavorited,
  };

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
}

// Hook to use the context
export function useGlobalContext() {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
}

// Specialized hooks for different parts of the state
export function useUser() {
  const { state, setUser, updatePreferences, updateStats, resetUser } =
    useGlobalContext();
  return {
    user: state.user,
    setUser,
    updatePreferences,
    updateStats,
    resetUser,
  };
}

export function useApp() {
  const { state, setLoading, setError, setNetworkStatus } = useGlobalContext();
  return {
    app: state.app,
    setLoading,
    setError,
    setNetworkStatus,
  };
}

export function useBoardGames() {
  const {
    state,
    toggleFavorite,
    addRecentlyPlayed,
    toggleWishlist,
    addCollection,
    updateCollection,
    deleteCollection,
    addSearchTerm,
    clearSearchHistory,
    setFilters,
    clearFilters,
    isGameFavorited,
    isGameInWishlist,
  } = useGlobalContext();
  return {
    boardGames: state.boardGames,
    toggleFavorite,
    addRecentlyPlayed,
    toggleWishlist,
    addCollection,
    updateCollection,
    deleteCollection,
    addSearchTerm,
    clearSearchHistory,
    setFilters,
    clearFilters,
    isGameFavorited,
    isGameInWishlist,
  };
}

export function useSessions() {
  const { state, startSession, endSession, updateSession } = useGlobalContext();
  return {
    sessions: state.sessions,
    startSession,
    endSession,
    updateSession,
  };
}

export function useLocations() {
  const {
    state,
    setCurrentLocation,
    setNearbyCafes,
    toggleFavoriteVenue,
    isVenueFavorited,
  } = useGlobalContext();
  return {
    locations: state.locations,
    setCurrentLocation,
    setNearbyCafes,
    toggleFavoriteVenue,
    isVenueFavorited,
  };
}

export function useNotifications() {
  const {
    state,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearNotifications,
  } = useGlobalContext();
  return {
    notifications: state.notifications,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearNotifications,
  };
}

export function useCache() {
  const { state, cacheGame, cacheGames, clearCache, getCachedGame } =
    useGlobalContext();
  return {
    cache: state.cache,
    cacheGame,
    cacheGames,
    clearCache,
    getCachedGame,
  };
}

export function useTheme() {
  const { state, updatePreferences, getCurrentTheme } = useGlobalContext();

  const setTheme = (theme: "light" | "dark" | "auto") => {
    updatePreferences({ theme });
  };

  return {
    theme: state.user.preferences?.theme || "auto",
    currentTheme: getCurrentTheme(),
    setTheme,
  };
}
