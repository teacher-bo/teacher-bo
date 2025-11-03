import { useMutation, useQuery } from "@apollo/client/react";
import {
  CHAT_WITH_AI,
  CREATE_CHAT_SESSION,
  GET_CHAT_SESSION,
} from "@/services/apolloClient";

interface ChatInput {
  message: string;
  sessionId: string;
  gameKey?: string;
}

interface ChatResponse {
  message: string;
  sessionId: string;
  timestamp: string;
  gameTitle?: string;
  answerType?: string;
  source?: string;
  page?: string;
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
  const [
    createChatSessionMutation,
    { loading: createSessionLoading, error: createSessionError },
  ] = useMutation<{ createChatSession: ChatSession }>(CREATE_CHAT_SESSION);

  const [chatWithAIMutation, { loading: chatLoading, error: chatError }] =
    useMutation<{ chat: ChatResponse }>(CHAT_WITH_AI);

  const loading = createSessionLoading || chatLoading;
  const error = createSessionError || chatError;

  // 채팅 세션 생성
  const createChatSession = async (
    sessionId: string
  ): Promise<ChatSession | null> => {
    try {
      const { data } = await createChatSessionMutation({
        variables: { sessionId },
      });

      return data?.createChatSession || null;
    } catch (err) {
      console.error("Create chat session error:", err);
      return null;
    }
  };

  // AI와 채팅
  const chatWithAI = async (input: ChatInput): Promise<ChatResponse | null> => {
    try {
      const { data } = await chatWithAIMutation({
        variables: { input },
      });

      return data?.chat || null;
    } catch (err) {
      console.error("Chat with AI error:", err);
      return null;
    }
  };

  return {
    loading,
    error: error?.message || null,
    createChatSession,
    chatWithAI,
  };
};

// 채팅 세션을 가져오는 별도 훅
export const useChatSession = (sessionId: string | null) => {
  const { data, loading, error, refetch } = useQuery<{
    getChatSession: ChatSession;
  }>(GET_CHAT_SESSION, {
    variables: { sessionId },
    skip: !sessionId,
    errorPolicy: "all",
    fetchPolicy: "cache-and-network",
  });

  return {
    chatSession: data?.getChatSession || null,
    loading,
    error,
    refetch,
  };
};
