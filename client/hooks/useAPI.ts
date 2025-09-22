import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import {
  ApiResponse,
  PaginatedResponse,
  BoardGame,
  SearchFilters,
  SearchResult,
} from "../types";
import { useApp } from "../providers/GlobalProvider";

// API Configuration
const API_BASE_URL = __DEV__
  ? "http://localhost:3000/api"
  : "https://api.boardgameassistant.com";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// API Response handlers
const handleApiResponse = <T>(response: { data: ApiResponse<T> }): T => {
  if (!response.data.success) {
    throw new Error(response.data.error || "API request failed");
  }
  return response.data.data!;
};

const handlePaginatedResponse = <T>(response: {
  data: PaginatedResponse<T>;
}): PaginatedResponse<T> => {
  if (!response.data.success) {
    throw new Error(response.data.error || "API request failed");
  }
  return response.data;
};

// Custom hooks for API calls

// Search board games
export function useSearchGames(
  query: string,
  filters: SearchFilters,
  page: number = 1
) {
  const { setLoading, setError } = useApp();

  return useQuery({
    queryKey: ["searchGames", query, filters, page],
    queryFn: async (): Promise<SearchResult> => {
      setLoading(true);
      try {
        const response = await apiClient.post<PaginatedResponse<BoardGame>>(
          "/games/search",
          {
            query,
            filters,
            page,
            limit: 20,
          }
        );

        const result = handlePaginatedResponse(response);
        return {
          games: result.data,
          total: result.pagination.total,
          hasMore: result.pagination.hasMore,
          page: result.pagination.page,
        };
      } catch (error) {
        const errorMessage =
          error instanceof AxiosError
            ? error.response?.data?.error || error.message
            : "Search failed";
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    enabled: query.length > 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Get game details
export function useGameDetails(gameId: string) {
  const { setLoading, setError } = useApp();

  return useQuery({
    queryKey: ["gameDetails", gameId],
    queryFn: async (): Promise<BoardGame> => {
      setLoading(true);
      try {
        const response = await apiClient.get<ApiResponse<BoardGame>>(
          `/games/${gameId}`
        );
        return handleApiResponse(response);
      } catch (error) {
        const errorMessage =
          error instanceof AxiosError
            ? error.response?.data?.error || error.message
            : "Failed to load game details";
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    enabled: !!gameId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get popular games
export function usePopularGames() {
  return useQuery({
    queryKey: ["popularGames"],
    queryFn: async (): Promise<BoardGame[]> => {
      const response = await apiClient.get<ApiResponse<BoardGame[]>>(
        "/games/popular"
      );
      return handleApiResponse(response);
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Get recommended games
export function useRecommendedGames(userId?: string) {
  return useQuery({
    queryKey: ["recommendedGames", userId],
    queryFn: async (): Promise<BoardGame[]> => {
      const response = await apiClient.get<ApiResponse<BoardGame[]>>(
        `/games/recommendations${userId ? `?userId=${userId}` : ""}`
      );
      return handleApiResponse(response);
    },
    enabled: true,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Submit game rating
export function useRateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      rating,
      review,
    }: {
      gameId: string;
      rating: number;
      review?: string;
    }) => {
      const response = await apiClient.post<ApiResponse<void>>(
        `/games/${gameId}/rate`,
        {
          rating,
          review,
        }
      );
      return handleApiResponse(response);
    },
    onSuccess: (_, { gameId }) => {
      // Invalidate and refetch game details
      queryClient.invalidateQueries({ queryKey: ["gameDetails", gameId] });
    },
  });
}

// Add game to collection
export function useAddToCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      collectionId,
    }: {
      gameId: string;
      collectionId: string;
    }) => {
      const response = await apiClient.post<ApiResponse<void>>(
        `/collections/${collectionId}/games`,
        {
          gameId,
        }
      );
      return handleApiResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

// Generic API hook with caching
export function useApiCall<T>(
  endpoint: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    data?: any;
    enabled?: boolean;
    staleTime?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  }
) {
  const { setLoading, setError } = useApp();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLocalLoading] = useState(false);
  const [error, setLocalError] = useState<Error | null>(null);

  const makeRequest = useCallback(async () => {
    if (options?.enabled === false) return;

    setLocalLoading(true);
    setLoading(true);
    setLocalError(null);
    setError(undefined);

    try {
      let response;
      const method = options?.method || "GET";

      switch (method) {
        case "GET":
          response = await apiClient.get<ApiResponse<T>>(endpoint);
          break;
        case "POST":
          response = await apiClient.post<ApiResponse<T>>(
            endpoint,
            options?.data
          );
          break;
        case "PUT":
          response = await apiClient.put<ApiResponse<T>>(
            endpoint,
            options?.data
          );
          break;
        case "DELETE":
          response = await apiClient.delete<ApiResponse<T>>(endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      const result = handleApiResponse(response);
      setData(result);
      options?.onSuccess?.(result);
    } catch (error) {
      const err =
        error instanceof AxiosError
          ? new Error(error.response?.data?.error || error.message)
          : (error as Error);

      setLocalError(err);
      setError(err.message);
      options?.onError?.(err);
    } finally {
      setLocalLoading(false);
      setLoading(false);
    }
  }, [endpoint, options]);

  useEffect(() => {
    if (options?.method === "GET" || !options?.method) {
      makeRequest();
    }
  }, [makeRequest]);

  return {
    data,
    loading,
    error,
    refetch: makeRequest,
  };
}

// Hook for handling API errors globally
export function useApiErrorHandler() {
  const { setError } = useApp();

  const handleError = useCallback(
    (error: unknown) => {
      let errorMessage = "An unknown error occurred";

      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          errorMessage = "Authentication required";
          // Handle logout or redirect to login
        } else if (error.response?.status === 403) {
          errorMessage = "Access forbidden";
        } else if (error.response?.status === 404) {
          errorMessage = "Resource not found";
        } else if (error.response && error.response.status >= 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage = error.response?.data?.error || error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    },
    [setError]
  );

  return { handleError };
}
