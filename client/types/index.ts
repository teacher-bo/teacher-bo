// User related types
export interface User {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  preferences: UserPreferences;
  stats: UserStats;
}

export interface UserPreferences {
  theme: "light" | "dark" | "auto";
  language: "ko" | "en" | "ja";
  notifications: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  autoSave: boolean;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface UserStats {
  gamesPlayed: number;
  totalPlayTime: number; // in minutes
  favoriteGenres: string[];
  winRate: number;
  averageRating: number;
}

// Board Game related types
export interface BoardGame {
  id: string;
  name: string;
  description: string;
  image: string;
  minPlayers: number;
  maxPlayers: number;
  playTime: number; // in minutes
  minAge: number;
  complexity: number; // 1-5 scale
  rating: number; // 1-10 scale
  genres: string[];
  mechanics: string[];
  year: number;
  designer: string[];
  artist: string[];
  publisher: string[];
  price?: number;
  availability: "available" | "out-of-stock" | "pre-order";
}

export interface GameSession {
  id: string;
  gameId: string;
  gameName: string;
  players: Player[];
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  winner?: string;
  scores?: { [playerId: string]: number };
  notes?: string;
  photos?: string[];
  location?: string;
}

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  isUser?: boolean;
}

export interface GameCollection {
  id: string;
  name: string;
  description?: string;
  gameIds: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

// App related types
export interface AppState {
  isLoading: boolean;
  error?: string;
  networkStatus: "online" | "offline";
  isFirstLaunch: boolean;
  currentVersion: string;
  needsUpdate: boolean;
}

// Search and Filter types
export interface SearchFilters {
  minPlayers?: number;
  maxPlayers?: number;
  minPlayTime?: number;
  maxPlayTime?: number;
  minAge?: number;
  maxAge?: number;
  complexity?: number[];
  genres?: string[];
  mechanics?: string[];
  rating?: number;
  availability?: ("available" | "out-of-stock" | "pre-order")[];
  priceRange?: [number, number];
}

export interface SearchResult {
  games: BoardGame[];
  total: number;
  hasMore: boolean;
  page: number;
}

// Location related types
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface BoardGameCafe {
  id: string;
  name: string;
  address: string;
  location: Location;
  rating: number;
  priceRange: number; // 1-4 scale
  phone?: string;
  website?: string;
  openingHours: OpeningHours[];
  gameLibrarySize?: number;
  amenities: string[];
  photos: string[];
  distance?: number; // in km
}

export interface OpeningHours {
  day:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  open: string; // "09:00"
  close: string; // "22:00"
  isClosed: boolean;
}

// Notification types
export interface Notification {
  id: string;
  title: string;
  body: string;
  type: "reminder" | "update" | "social" | "system";
  isRead: boolean;
  createdAt: Date;
  data?: any;
  actionUrl?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  error?: string;
}

// Constants
export const GAME_GENRES = [
  "Strategy",
  "Eurogame",
  "Thematic",
  "War",
  "Family",
  "Party",
  "Abstract",
  "Cooperative",
  "Deck Building",
  "Worker Placement",
  "Area Control",
  "Engine Building",
  "Tile Placement",
  "Roll and Write",
  "Social Deduction",
  "Dexterity",
  "Puzzle",
  "Racing",
  "Economic",
] as const;

export const GAME_MECHANICS = [
  "Card Drafting",
  "Dice Rolling",
  "Hand Management",
  "Set Collection",
  "Variable Player Powers",
  "Action Point Allowance System",
  "Area Movement",
  "Trading",
  "Bluffing",
  "Memory",
  "Pattern Recognition",
  "Route Building",
  "Simultaneous Action Selection",
  "Storytelling",
  "Take That",
  "Trick Taking",
  "Voting",
  "Real Time",
  "Legacy",
] as const;

export type GameGenre = (typeof GAME_GENRES)[number];
export type GameMechanic = (typeof GAME_MECHANICS)[number];
