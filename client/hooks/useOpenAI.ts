import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { 
  CHAT_WITH_AI, 
  SEARCH_FILES, 
  CREATE_CHAT_SESSION, 
  GET_CHAT_SESSION 
} from '@/services/apolloClient';

interface ChatInput {
  message: string;
  sessionId: string;
  context?: string[];
}

interface FileSearchInput {
  query: string;
  promptId?: string;
  promptVersion?: string;
  vectorStoreIds?: string[];
}

interface ChatResponse {
  message: string;
  sessionId: string;
  timestamp: string;
}

interface FileSearchResponse {
  answer: string;
  query: string;
  sources: string[];
  timestamp: string;
}

interface ChatSession {
  id: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    timestamp: string;
  }>;
}

export const useOpenAI = () => {
  // Apollo hooks
  const [createChatSessionMutation, { loading: createSessionLoading, error: createSessionError }] = 
    useMutation<{ createChatSession: ChatSession }>(CREATE_CHAT_SESSION);
  
  const [chatWithAIMutation, { loading: chatLoading, error: chatError }] = 
    useMutation<{ chat: ChatResponse }>(CHAT_WITH_AI);
  
  const [searchFilesMutation, { loading: searchLoading, error: searchError }] = 
    useMutation<{ searchFiles: FileSearchResponse }>(SEARCH_FILES);

  const loading = createSessionLoading || chatLoading || searchLoading;
  const error = createSessionError || chatError || searchError;

  // 채팅 세션 생성
  const createChatSession = async (sessionId: string): Promise<ChatSession | null> => {
    try {
      const { data } = await createChatSessionMutation({
        variables: { sessionId }
      });
      
      return data?.createChatSession || null;
    } catch (err) {
      console.error('Create chat session error:', err);
      return null;
    }
  };

  // AI와 채팅
  const chatWithAI = async (input: ChatInput): Promise<ChatResponse | null> => {
    try {
      const { data } = await chatWithAIMutation({
        variables: { input }
      });
      
      return data?.chat || null;
    } catch (err) {
      console.error('Chat with AI error:', err);
      return null;
    }
  };

  // 파일 검색
  const searchFiles = async (input: FileSearchInput): Promise<FileSearchResponse | null> => {
    try {
      const { data } = await searchFilesMutation({
        variables: { input }
      });
      
      return data?.searchFiles || null;
    } catch (err) {
      console.error('Search files error:', err);
      return null;
    }
  };

  return {
    loading,
    error: error?.message || null,
    createChatSession,
    chatWithAI,
    searchFiles,
  };
};

// 채팅 세션을 가져오는 별도 훅
export const useChatSession = (sessionId: string | null) => {
  const { data, loading, error, refetch } = useQuery<{ getChatSession: ChatSession }>(
    GET_CHAT_SESSION,
    {
      variables: { sessionId },
      skip: !sessionId,
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network'
    }
  );

  return {
    chatSession: data?.getChatSession || null,
    loading,
    error,
    refetch
  };
};