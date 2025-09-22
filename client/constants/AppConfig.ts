// App Configuration
export const APP_CONFIG = {
  name: "Board Game Assistant",
  version: "1.0.0",
  description: "보드게임을 더 즐겁게! 게임 추천, 규칙 검색, 세션 관리까지",

  // API Configuration
  api: {
    baseUrl: __DEV__
      ? "http://localhost:3000/api"
      : "https://api.boardgameassistant.com",
    timeout: 10000,
    retryCount: 3,
    retryDelay: 1000,
  },

  // Storage Configuration
  storage: {
    encryptionKey: "board_game_assistant_2024",
    version: "1.0",
  },

  // Feature Flags
  features: {
    socialSharing: true,
    offlineMode: true,
    pushNotifications: true,
    locationServices: true,
    cameraIntegration: true,
    voiceSearch: false, // Coming soon
    aiRecommendations: true,
    multiplayer: false, // Coming soon
  },

  // Limits and Constraints
  limits: {
    maxFavorites: 100,
    maxCollections: 20,
    maxGamesPerCollection: 100,
    maxRecentlyPlayed: 50,
    maxSearchHistory: 20,
    maxSessionHistory: 200,
    maxPhotoUploads: 10,
    maxPhotoSizeMB: 5,
  },

  // Default Settings
  defaults: {
    searchResultsPerPage: 20,
    sessionReminderMinutes: 30,
    locationSearchRadius: 5000, // meters
    cacheExpiration: 24 * 60 * 60 * 1000, // 24 hours
    imageCompressionQuality: 0.8,
    animationDuration: 300,
  },
} as const;

// Game Categories and Filters
export const GAME_CATEGORIES = {
  weight: {
    light: { min: 1, max: 2.5, label: "가벼운 게임" },
    medium: { min: 2.5, max: 4, label: "중간 게임" },
    heavy: { min: 4, max: 5, label: "무거운 게임" },
  },

  playTime: {
    quick: { min: 0, max: 30, label: "빠른 게임 (30분 이내)" },
    short: { min: 30, max: 60, label: "짧은 게임 (30-60분)" },
    medium: { min: 60, max: 120, label: "중간 게임 (1-2시간)" },
    long: { min: 120, max: 240, label: "긴 게임 (2-4시간)" },
    epic: { min: 240, max: 999, label: "에픽 게임 (4시간+)" },
  },

  playerCount: {
    solo: { min: 1, max: 1, label: "솔로 게임" },
    couple: { min: 2, max: 2, label: "커플 게임" },
    small: { min: 3, max: 4, label: "소규모 (3-4명)" },
    medium: { min: 5, max: 6, label: "중규모 (5-6명)" },
    large: { min: 7, max: 12, label: "대규모 (7-12명)" },
    party: { min: 13, max: 99, label: "파티 게임 (13명+)" },
  },

  age: {
    kids: { min: 0, max: 8, label: "어린이 (8세 이하)" },
    family: { min: 8, max: 12, label: "가족 (8-12세)" },
    teen: { min: 12, max: 16, label: "청소년 (12-16세)" },
    adult: { min: 16, max: 99, label: "성인 (16세 이상)" },
  },
} as const;

// UI Constants
export const UI_CONSTANTS = {
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Border Radius
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  // Icon Sizes
  iconSize: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 48,
  },

  // Animation Durations
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },

  // Z-index layers
  zIndex: {
    base: 0,
    dropdown: 100,
    modal: 200,
    notification: 300,
    tooltip: 400,
  },
} as const;

// Breakpoints for responsive design
export const BREAKPOINTS = {
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
} as const;

// Social Media Links
export const SOCIAL_LINKS = {
  website: "https://boardgameassistant.com",
  facebook: "https://facebook.com/boardgameassistant",
  twitter: "https://twitter.com/bgassistant",
  instagram: "https://instagram.com/boardgameassistant",
  youtube: "https://youtube.com/@boardgameassistant",
  discord: "https://discord.gg/boardgameassistant",
  email: "support@boardgameassistant.com",
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  network: {
    offline: "인터넷 연결을 확인해주세요.",
    timeout: "요청 시간이 초과되었습니다. 다시 시도해주세요.",
    serverError: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    notFound: "요청한 정보를 찾을 수 없습니다.",
  },

  auth: {
    required: "로그인이 필요합니다.",
    invalid: "잘못된 사용자 정보입니다.",
    expired: "세션이 만료되었습니다. 다시 로그인해주세요.",
  },

  validation: {
    required: "필수 입력 항목입니다.",
    email: "올바른 이메일 주소를 입력해주세요.",
    minLength: "최소 {length}자 이상 입력해주세요.",
    maxLength: "최대 {length}자 이하로 입력해주세요.",
    numeric: "숫자만 입력 가능합니다.",
  },

  permission: {
    camera: "카메라 권한이 필요합니다.",
    location: "위치 권한이 필요합니다.",
    notification: "알림 권한이 필요합니다.",
    storage: "저장소 권한이 필요합니다.",
  },
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  save: "저장되었습니다.",
  update: "업데이트되었습니다.",
  delete: "삭제되었습니다.",
  share: "공유되었습니다.",
  copy: "복사되었습니다.",
  favorite: "즐겨찾기에 추가되었습니다.",
  unfavorite: "즐겨찾기에서 제거되었습니다.",
} as const;

// Regular Expressions
export const REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$/,
  korean: /[가-힣]/,
  english: /[a-zA-Z]/,
  number: /^[0-9]+$/,
  gameId: /^[a-zA-Z0-9-_]+$/,
} as const;

// Date Formats
export const DATE_FORMATS = {
  display: "yyyy년 MM월 dd일",
  displayWithTime: "yyyy년 MM월 dd일 HH:mm",
  api: "yyyy-MM-dd",
  apiWithTime: "yyyy-MM-dd HH:mm:ss",
  time: "HH:mm",
  short: "MM/dd",
  relative: "relative", // Special format for relative dates
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  user: "user_data",
  preferences: "user_preferences",
  favorites: "favorite_games",
  recentlyPlayed: "recently_played",
  collections: "game_collections",
  wishlist: "wishlist",
  searchHistory: "search_history",
  sessionHistory: "session_history",
  notifications: "notifications",
  favoriteVenues: "favorite_venues",
  onboardingCompleted: "onboarding_completed",
  firstLaunch: "first_launch",
  cacheTimestamp: "cache_timestamp",
} as const;

// Analytics Events
export const ANALYTICS_EVENTS = {
  // App Events
  appLaunched: "app_launched",
  appBackgrounded: "app_backgrounded",
  appCrashed: "app_crashed",

  // User Events
  userLogin: "user_login",
  userLogout: "user_logout",
  userSignup: "user_signup",
  profileUpdated: "profile_updated",

  // Game Events
  gameViewed: "game_viewed",
  gameSearched: "game_searched",
  gameFavorited: "game_favorited",
  gameUnfavorited: "game_unfavorited",
  gameRated: "game_rated",
  gameShared: "game_shared",

  // Session Events
  sessionStarted: "session_started",
  sessionEnded: "session_ended",
  sessionPaused: "session_paused",
  sessionResumed: "session_resumed",

  // Social Events
  collectionCreated: "collection_created",
  collectionShared: "collection_shared",
  venueVisited: "venue_visited",
  reviewWritten: "review_written",

  // Error Events
  errorOccurred: "error_occurred",
  apiError: "api_error",
  crashReported: "crash_reported",
} as const;
