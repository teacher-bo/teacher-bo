import {
  format,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  isToday,
  isYesterday,
  isTomorrow,
} from "date-fns";
import { ko } from "date-fns/locale";
import { BoardGame, GameSession, Player } from "../types";

// Board Game specific utilities
export const gameUtils = {
  // Calculate game complexity score (1-10)
  getComplexityScore: (game: BoardGame): number => {
    let score = game.complexity || 1;

    // Adjust based on play time
    if (game.playTime > 180) score += 1;
    if (game.playTime > 240) score += 1;

    // Adjust based on player count flexibility
    const playerRange = game.maxPlayers - game.minPlayers;
    if (playerRange <= 1) score += 0.5;

    // Adjust based on age rating
    if (game.minAge >= 14) score += 0.5;
    if (game.minAge >= 18) score += 0.5;

    return Math.min(10, Math.max(1, Math.round(score * 10) / 10));
  },

  // Check if a game is suitable for given player count
  isValidPlayerCount: (game: BoardGame, playerCount: number): boolean => {
    return playerCount >= game.minPlayers && playerCount <= game.maxPlayers;
  },

  // Get estimated play time range
  getPlayTimeRange: (game: BoardGame): string => {
    const baseTime = game.playTime;
    const minTime = Math.max(15, baseTime - 30);
    const maxTime = baseTime + 60;

    if (minTime === maxTime) {
      return `${baseTime}분`;
    }

    return `${minTime}-${maxTime}분`;
  },

  // Calculate game weight (complexity + time investment)
  getGameWeight: (game: BoardGame): "light" | "medium" | "heavy" => {
    const complexity = game.complexity || 1;
    const playTime = game.playTime;

    const weight = complexity * 0.7 + (playTime / 60) * 0.3;

    if (weight <= 2.5) return "light";
    if (weight <= 4) return "medium";
    return "heavy";
  },

  // Find similar games based on mechanics and genres
  findSimilarGames: (
    targetGame: BoardGame,
    games: BoardGame[]
  ): BoardGame[] => {
    return games
      .filter((game) => game.id !== targetGame.id)
      .map((game) => ({
        ...game,
        similarity: calculateSimilarity(targetGame, game),
      }))
      .filter((game) => game.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);
  },

  // Get recommended player count for optimal experience
  getOptimalPlayerCount: (game: BoardGame): number => {
    // This would typically be based on BGG data or user reviews
    // For now, we'll use a simple heuristic
    const range = game.maxPlayers - game.minPlayers;

    if (range === 0) return game.minPlayers;
    if (range === 1) return game.maxPlayers;

    // Generally, games are best at 75% of their max capacity
    return Math.round(game.minPlayers + range * 0.75);
  },

  // Format game rating
  formatRating: (rating: number): string => {
    return rating.toFixed(1);
  },

  // Get difficulty label
  getDifficultyLabel: (complexity: number): string => {
    if (complexity <= 2) return "초보자용";
    if (complexity <= 3) return "쉬움";
    if (complexity <= 4) return "보통";
    if (complexity <= 4.5) return "어려움";
    return "전문가용";
  },

  // Calculate total value score (rating + complexity + replayability)
  calculateValueScore: (game: BoardGame): number => {
    const rating = game.rating || 5;
    const complexity = game.complexity || 1;
    const replayability = game.mechanics.length * 0.2; // More mechanics = more replayability

    return (
      Math.round((rating * 0.6 + complexity * 0.2 + replayability * 0.2) * 10) /
      10
    );
  },
};

// Session management utilities
export const sessionUtils = {
  // Calculate session duration in readable format
  formatDuration: (startTime: Date, endTime?: Date): string => {
    const end = endTime || new Date();
    const diffInMinutes = differenceInMinutes(end, startTime);

    if (diffInMinutes < 60) {
      return `${diffInMinutes}분`;
    }

    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;

    return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
  },

  // Calculate win rate for a player
  calculateWinRate: (sessions: GameSession[], playerId: string): number => {
    const playerSessions = sessions.filter((session) =>
      session.players.some((p) => p.id === playerId)
    );

    if (playerSessions.length === 0) return 0;

    const wins = playerSessions.filter(
      (session) => session.winner === playerId
    ).length;
    return Math.round((wins / playerSessions.length) * 100);
  },

  // Get player statistics
  getPlayerStats: (sessions: GameSession[], playerId: string) => {
    const playerSessions = sessions.filter((session) =>
      session.players.some((p) => p.id === playerId)
    );

    const totalPlayTime = playerSessions.reduce(
      (total, session) => total + (session.duration || 0),
      0
    );

    const wins = playerSessions.filter(
      (session) => session.winner === playerId
    ).length;
    const winRate =
      playerSessions.length > 0 ? (wins / playerSessions.length) * 100 : 0;

    const gamesPlayed = [...new Set(playerSessions.map((s) => s.gameId))]
      .length;

    return {
      totalGames: playerSessions.length,
      totalPlayTime: Math.round(totalPlayTime / 60), // in hours
      uniqueGames: gamesPlayed,
      wins,
      winRate: Math.round(winRate),
    };
  },

  // Get most played games
  getMostPlayedGames: (
    sessions: GameSession[]
  ): Array<{ gameId: string; gameName: string; count: number }> => {
    const gameCount = sessions.reduce((acc, session) => {
      if (!acc[session.gameId]) {
        acc[session.gameId] = {
          gameId: session.gameId,
          gameName: session.gameName,
          count: 0,
        };
      }
      acc[session.gameId].count++;
      return acc;
    }, {} as Record<string, { gameId: string; gameName: string; count: number }>);

    return Object.values(gameCount).sort((a, b) => b.count - a.count);
  },

  // Format session date
  formatSessionDate: (date: Date): string => {
    if (isToday(date)) return "오늘";
    if (isYesterday(date)) return "어제";
    if (isTomorrow(date)) return "내일";

    const daysDiff = differenceInDays(new Date(), date);
    if (Math.abs(daysDiff) <= 7) {
      return format(date, "EEEE", { locale: ko });
    }

    return format(date, "MM월 dd일", { locale: ko });
  },
};

// Search and filter utilities
export const searchUtils = {
  // Highlight search terms in text
  highlightSearchTerms: (text: string, searchTerm: string): string => {
    if (!searchTerm) return text;

    const regex = new RegExp(`(${searchTerm})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  },

  // Normalize search query
  normalizeQuery: (query: string): string => {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s가-힣]/g, "")
      .replace(/\s+/g, " ");
  },

  // Create search keywords from game data
  createSearchKeywords: (game: BoardGame): string[] => {
    const keywords = [
      game.name,
      ...game.genres,
      ...game.mechanics,
      ...game.designer,
      ...game.publisher,
      game.year.toString(),
    ];

    return keywords
      .filter(Boolean)
      .map((keyword) => keyword.toLowerCase())
      .concat(
        // Add variations
        keywords.flatMap((keyword) => [
          keyword.replace(/\s/g, ""),
          keyword.replace(/[^\w\s가-힣]/g, ""),
        ])
      );
  },

  // Fuzzy search matching
  fuzzyMatch: (text: string, query: string): number => {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    if (textLower.includes(queryLower)) {
      return 1;
    }

    // Calculate Levenshtein distance for fuzzy matching
    const distance = levenshteinDistance(textLower, queryLower);
    const maxLength = Math.max(textLower.length, queryLower.length);

    return Math.max(0, (maxLength - distance) / maxLength);
  },
};

// Recommendation utilities
export const recommendationUtils = {
  // Calculate recommendation score based on user preferences
  calculateRecommendationScore: (
    game: BoardGame,
    userPreferences: {
      favoriteGenres: string[];
      complexity: number;
      playerCount: number;
      playTime: number;
    }
  ): number => {
    let score = 0;

    // Genre matching (40% weight)
    const genreMatches = game.genres.filter((genre) =>
      userPreferences.favoriteGenres.includes(genre)
    ).length;
    score +=
      (genreMatches / Math.max(1, userPreferences.favoriteGenres.length)) * 40;

    // Complexity matching (20% weight)
    const complexityDiff = Math.abs(
      game.complexity - userPreferences.complexity
    );
    score += Math.max(0, (5 - complexityDiff) / 5) * 20;

    // Player count suitability (20% weight)
    if (gameUtils.isValidPlayerCount(game, userPreferences.playerCount)) {
      score += 20;
    }

    // Play time matching (20% weight)
    const timeDiff = Math.abs(game.playTime - userPreferences.playTime);
    score += Math.max(0, (180 - timeDiff) / 180) * 20;

    return Math.round(score);
  },

  // Get trending games (based on recent activity)
  getTrendingGames: (
    games: BoardGame[],
    recentSessions: GameSession[]
  ): BoardGame[] => {
    const recentGameIds = recentSessions
      .filter(
        (session) => differenceInDays(new Date(), session.startTime) <= 30
      )
      .map((session) => session.gameId);

    const gamePopularity = recentGameIds.reduce((acc, gameId) => {
      acc[gameId] = (acc[gameId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return games
      .filter((game) => gamePopularity[game.id])
      .sort((a, b) => (gamePopularity[b.id] || 0) - (gamePopularity[a.id] || 0))
      .slice(0, 20);
  },
};

// Helper functions
function calculateSimilarity(game1: BoardGame, game2: BoardGame): number {
  const genreMatches = game1.genres.filter((genre) =>
    game2.genres.includes(genre)
  ).length;
  const mechanicMatches = game1.mechanics.filter((mechanic) =>
    game2.mechanics.includes(mechanic)
  ).length;

  const genreSimilarity =
    genreMatches / Math.max(game1.genres.length, game2.genres.length);
  const mechanicSimilarity =
    mechanicMatches / Math.max(game1.mechanics.length, game2.mechanics.length);
  const complexitySimilarity =
    1 - Math.abs(game1.complexity - game2.complexity) / 5;
  const timeSimilarity =
    1 -
    Math.abs(game1.playTime - game2.playTime) /
      Math.max(game1.playTime, game2.playTime);

  return (
    genreSimilarity * 0.3 +
    mechanicSimilarity * 0.4 +
    complexitySimilarity * 0.2 +
    timeSimilarity * 0.1
  );
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[str2.length][str1.length];
}

// Price formatting utilities
export const priceUtils = {
  formatPrice: (price: number, currency: string = "KRW"): string => {
    if (currency === "KRW") {
      return new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW",
      }).format(price);
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price);
  },

  getPriceRange: (minPrice: number, maxPrice: number): string => {
    if (minPrice === maxPrice) {
      return priceUtils.formatPrice(minPrice);
    }

    return `${priceUtils.formatPrice(minPrice)} - ${priceUtils.formatPrice(
      maxPrice
    )}`;
  },
};
