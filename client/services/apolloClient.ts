import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
  gql,
} from "@apollo/client";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";

const API_URL = process.env.EXPO_PUBLIC_URL || "";

// HTTP Link
const httpLink = createHttpLink({
  uri: `${API_URL}/api/graphql`,
});

// WebSocket Link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: `${API_URL.replace("http", "ws")}/api/graphql`,
    shouldRetry: () => true,
  })
);

// Split link based on operation type
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  httpLink
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: "all",
    },
    query: {
      errorPolicy: "all",
    },
  },
});

// GraphQL Queries and Mutations
export const CREATE_SESSION = gql`
  mutation CreateSession($gameType: String!, $metadata: JSON) {
    createSession(gameType: $gameType, metadata: $metadata) {
      id
      gameType
      status
      startTime
      metadata
    }
  }
`;

export const END_SESSION = gql`
  mutation EndSession($sessionId: String!, $endTime: String!) {
    endSession(sessionId: $sessionId, endTime: $endTime) {
      id
      status
      endTime
      transcription
      summary
    }
  }
`;

export const PROCESS_AUDIO_CHUNK = gql`
  mutation ProcessAudioChunk(
    $sessionId: String!
    $audioData: [Float!]!
    $timestamp: Float!
    $sampleRate: Int!
  ) {
    processAudioChunk(
      sessionId: $sessionId
      audioData: $audioData
      timestamp: $timestamp
      sampleRate: $sampleRate
    ) {
      sessionId
      processed
      transcriptionFragment
    }
  }
`;

export const GET_SESSION = gql`
  query GetSession($sessionId: String!) {
    session(id: $sessionId) {
      id
      gameType
      status
      startTime
      endTime
      transcription
      summary
      metadata
    }
  }
`;

export const TRANSCRIPTION_UPDATED = gql`
  subscription TranscriptionUpdated($sessionId: String!) {
    transcriptionUpdated(sessionId: $sessionId) {
      sessionId
      text
      isFinal
      timestamp
    }
  }
`;

// OpenAI Mutations and Queries
export const CHAT_WITH_AI = gql`
  mutation ChatWithAI($input: ChatInput!) {
    chat(input: $input) {
      message
      sessionId
      timestamp
      gameTitle
      answerType
      source
      page
    }
  }
`;

export const CREATE_CHAT_SESSION = gql`
  mutation CreateChatSession($sessionId: String!) {
    createChatSession(sessionId: $sessionId) {
      id
      sessionId
      createdAt
      updatedAt
      messages {
        id
        role
        content
        timestamp
      }
    }
  }
`;

export const GET_CHAT_SESSION = gql`
  query GetChatSession($sessionId: String!) {
    getChatSession(sessionId: $sessionId) {
      id
      sessionId
      createdAt
      updatedAt
      messages {
        id
        role
        content
        timestamp
      }
    }
  }
`;

// Polly TTS Mutations and Queries
export const SYNTHESIZE_SPEECH = gql`
  mutation SynthesizeSpeech($input: SynthesizeSpeechInput!) {
    synthesizeSpeech(input: $input) {
      audioBase64
      contentType
      audioSize
    }
  }
`;

export const GET_AVAILABLE_KOREAN_VOICES = gql`
  query GetAvailableKoreanVoices {
    getAvailableKoreanVoices {
      id
      name
      gender
      engine
    }
  }
`;
