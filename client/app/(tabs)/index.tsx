import React, { useState, useEffect, useRef } from "react";
import * as WebBrowser from "expo-web-browser";
import {
  Dimensions,
  Platform,
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ExpoAudioStreamModule } from "@siteed/expo-audio-studio";

import { Text } from "@/components/ui/Text";
import Breathe from "@/components/Breathe";
import { ClientOnly } from "@/components/ClientOnly";
import GameSelectionModal, { GAMES } from "@/components/GameSelectionModal";
import MicButton from "@/components/MicButton";
import RulebookViewer from "@/components/RulebookViewer";
import { useStreamingAudioService } from "../../hooks/useStreamingAudioService";
import { useOpenAI } from "../../hooks/useOpenAI";
import { usePollyTTS } from "../../hooks/usePollyTTS";
import { useWakeWord } from "../../hooks/useWakeWord";

export const RULEBOOK_URLS: Record<string, any> = {
  rummikub:
    "https://teacher-bo-amazon-transcribe-voca-filter.s3.ap-northeast-2.amazonaws.com/rulebooks/rummikub.rulebook.pdf",
  halligalli:
    "https://teacher-bo-amazon-transcribe-voca-filter.s3.ap-northeast-2.amazonaws.com/rulebooks/halligalli.rulebook.pdf",
  sabotage:
    "https://teacher-bo-amazon-transcribe-voca-filter.s3.ap-northeast-2.amazonaws.com/rulebooks/sabotage.rulebook.pdf",
};

interface Message {
  id: string;
  isUser: boolean;
  textItems: { resultId: string; text: string }[];
  timestamp: Date;
  source?: string;
  page?: string; // Add page field
  isDummy?: boolean;
}

// Constants
const MESSAGES_COMPACT_HEIGHT = 220; // Height for showing 2-3 messages in compact view
const MESSAGES_EXPANDED_HEIGHT = 500; // Fixed height when expanded
const BREATHE_OFFSET_COMPACT = -100; // Breathe offset when messages are compact
const BREATHE_OFFSET_EXPANDED = -280; // Breathe offset when messages are expanded
const BREATHE_SIZE_REDUCTION = 0.7; // Scale factor for Breathe when expanded (70% of original size)

export default function BreathePage() {
  return (
    <ClientOnly fallback={<View style={styles.container} />}>
      <BreathePageContent />
    </ClientOnly>
  );
}

function BreathePageContent() {
  const wind = Dimensions.get("window");
  const width = Platform.OS === "web" ? 440 : wind.width;

  const generateChatSessionId = () =>
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const [chatSessionId] = useState<string>(generateChatSessionId());

  // Game selection state
  const [selectedGameKey, setSelectedGameKey] = useState<string | null>(null);
  const [showGameSelection, setShowGameSelection] = useState(true);
  const [showRulebook, setShowRulebook] = useState(false);
  const [rulebookPage, setRulebookPage] = useState(1);

  const userTranscriptRef = useRef<string>("");
  const [messages, setMessages] = useState<Message[]>([]);

  // dummy message for testing
  // const [messages, setMessages] = useState<Message[]>([
  //   {
  //     id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  //     isUser: false,
  //     textItems: [
  //       {
  //         resultId: `item_${Date.now()}`,
  //         text:
  //           "루미큐브 게임은 시계방향으로 진행되며, 각 플레이어는 처음에 타일의 숫자 합이 30 이상이 되도록 타일을 내려놓아야 합니다. 이후에는 테이블의 타일과 자신의 타일을 조합하여 내려놓거나, 내려놓을 타일이 없으면 풀에서 타일을 한 개 가져옵니다. 게임은 한 플레이어가 타일을 모두 내려놓고 '루미큐브'를 외칠 때까지 계속됩니다.",
  //       },
  //     ],
  //     timestamp: new Date(),
  //     source:
  //       "게임은 시계방향(왼쪽)으로 진행된다. 각 게임자가 맨 처음 타일을 내려놓기 위해서는 타일의 숫자 합이 30이상이 되도록 만들어서 한 세트 또는 그 이상의 세트를 내려놓아야 하며 이것을 등록이라고 한다.",
  //     page: "2",
  //   },
  // ]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [breatheOffsetY, setBreatheOffsetY] = useState(0);
  const [breatheScale, setBreatheScale] = useState(1); // Scale for Breathe size
  const messagesHeight = useRef(
    new Animated.Value(MESSAGES_COMPACT_HEIGHT)
  ).current; // Initial compact height
  const currentlyAddingMessageRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    isRecording,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    sttDatas,
    resetSttDatas,
    onVadEnded,
  } = useStreamingAudioService();

  const { chatWithAI } = useOpenAI();

  const { speakText, stopSpeaking } = usePollyTTS();

  // State machine for conversation flow
  type ConversationState =
    | "IDLE" // Waiting for wake word
    | "GREETING" // Playing greeting message
    | "LISTENING" // Recording user speech
    | "PROCESSING" // AI is processing the query
    | "SPEAKING"; // Playing AI response

  const [conversationState, setConversationState] =
    useState<ConversationState>("IDLE");

  // Add new message with slide up animation
  const addMessage = (isUser: boolean, content: string) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isUser,
      textItems: [{ resultId: `item_${Date.now()}`, text: content }],
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
  };

  // Toggle messages expansion
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);

    if (!isExpanded) {
      // Expanding
      setBreatheOffsetY(BREATHE_OFFSET_EXPANDED);
      setBreatheScale(BREATHE_SIZE_REDUCTION);
      Animated.timing(messagesHeight, {
        toValue: MESSAGES_EXPANDED_HEIGHT, // Fixed expanded height
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        // Scroll to bottom after animation completes
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });
    } else {
      // Collapsing
      setBreatheOffsetY(messages.length > 0 ? BREATHE_OFFSET_COMPACT : 0);
      setBreatheScale(1);
      Animated.timing(messagesHeight, {
        toValue: MESSAGES_COMPACT_HEIGHT, // Compact height
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  // Initialize Breathe position slightly up when messages exist
  useEffect(() => {
    if (messages.length > 0 && !isExpanded) {
      setBreatheOffsetY(BREATHE_OFFSET_COMPACT);
    } else if (messages.length === 0) {
      setBreatheOffsetY(0);
    }
  }, [messages.length, isExpanded]);

  // Scroll to bottom when messages change (if expanded)
  useEffect(() => {
    if (isExpanded && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isExpanded]);

  /**
   * Wake word detection and handling logic
   */
  const {
    startListening: startWakeWordListening,
    stopListening: stopWakeWordListening,
  } = useWakeWord(
    async () => {
      if (conversationState !== "IDLE") {
        console.log(
          "⚠️ Wake word ignored, not in IDLE state:",
          conversationState
        );
        return;
      }

      await stopWakeWordListening();
      setConversationState("GREETING");

      try {
        const text = `
          <speak xml:lang="ko-KR">
            <prosody pitch="+2%" volume="x-loud"> 안녕하세요! </prosody>
            <break time="300ms"/>
            <prosody pitch="+8%" rate="fast"> 무엇을 도와드릴까요? </prosody>
          </speak>
        `;

        addMessage(false, "안녕하세요! 무엇을 도와드릴까요?");
        await speakText(text);
      } catch (err) {
        console.error("Greeting TTS failed", err);
      }

      await new Promise((resolve) => setTimeout(resolve, 700));
      setConversationState("LISTENING");
    },
    {
      wakeWords: ["보쌤", "보셈", "보샘", "꽃샘", "못생", "요새", "글쎄"],
      language: "ko-KR",
      sensitivity: 0.6,
      continuous: true,
    }
  );

  // Start wake word listening on component mount
  useEffect(() => {
    startWakeWordListening();
    return () => {
      stopWakeWordListening();
    };
  }, []);

  // State가 LISTENING으로 변경되면 녹음 시작
  useEffect(() => {
    if (conversationState === "LISTENING" && !isRecording) {
      addDummyMessage();
      startRecording();
    }
  }, [conversationState, isRecording]);

  /**
   * Add dummy message to ensure proper message flow
   */
  const addDummyMessage = () => {
    const dummyMessage: Message = {
      id: `dummy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isUser: false,
      textItems: [{ resultId: `dummy_${Date.now()}`, text: "" }],
      timestamp: new Date(),
      isDummy: true,
    };

    setMessages((prev) => [...prev, dummyMessage]);
    console.log("Added dummy message:", dummyMessage.id);
  };

  // STT 데이터를 실시간으로 메시지에 반영
  useEffect(() => {
    if (sttDatas.length === 0) return;
    if (conversationState !== "LISTENING" || !isRecording) return;

    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      const latestData = sttDatas[sttDatas.length - 1];

      if (currentlyAddingMessageRef.current && lastMessage?.isUser) {
        const exists = lastMessage.textItems.find(
          (item) => item.resultId === latestData.resultId
        );

        let textItems: Message["textItems"];
        if (exists) {
          textItems = lastMessage.textItems.map((item) =>
            item.resultId === latestData.resultId
              ? { ...item, text: latestData.text }
              : item
          );
        } else {
          textItems = [
            ...lastMessage.textItems,
            { resultId: latestData.resultId, text: latestData.text },
          ];
        }

        return prev.map((m) =>
          m.id === lastMessage.id ? { ...m, textItems } : m
        );
      }

      currentlyAddingMessageRef.current = true;

      const newMessage: Message = {
        id: latestData.resultId,
        textItems: [
          {
            resultId: lastMessage?.isDummy ? "-1" : latestData.resultId,
            text: lastMessage?.isDummy ? "" : latestData.text,
          },
        ],
        isUser: true,
        timestamp: new Date(latestData.timestamp),
      };

      console.log("생성된 메시지:", newMessage);
      return [...prev, newMessage];
    });
  }, [sttDatas, conversationState, isRecording]);

  const startRecording = async () => {
    try {
      if (conversationState !== "LISTENING") {
        console.log("Not in LISTENING state");
        return;
      }

      // Clear previous data before starting new recording
      userTranscriptRef.current = "";
      resetSttDatas();
      currentlyAddingMessageRef.current = false;

      await startAudioRecording();
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording", err);
      setConversationState("IDLE");
      await startWakeWordListening();
    }
  };

  const stopRecording = async () => {
    try {
      if (conversationState !== "LISTENING") {
        console.log("Not currently in LISTENING state");
        return;
      }

      console.log("Recording stopped");
      setConversationState("PROCESSING");
      await stopAudioRecording();

      // Use functional update to get latest messages
      setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        console.log("Last message:", lastMessage);

        if (
          lastMessage &&
          lastMessage.isUser &&
          lastMessage.textItems.length > 0
        ) {
          const userText = lastMessage.textItems
            .map((item) => item.text)
            .join(" ")
            .trim();

          if (userText) {
            console.log("Sending to OpenAI:", userText);

            // Call AI and add response asynchronously
            (async () => {
              try {
                const aiResponse = await chatWithAI({
                  message: userText,
                  sessionId: chatSessionId,
                  gameKey: selectedGameKey || undefined,
                });

                if (aiResponse) {
                  const botMessage: Message = {
                    id: `bot_${Date.now()}_${Math.random()
                      .toString(36)
                      .substr(2, 9)}`,
                    isUser: false,
                    textItems: [
                      {
                        resultId: `ai_${Date.now()}`,
                        text: aiResponse.message,
                      },
                    ],
                    timestamp: new Date(),
                    source: aiResponse.source,
                    page: aiResponse.page,
                    // source: "OpenAI GPT-4",
                  };

                  setMessages((prev) => [...prev, botMessage]);

                  setConversationState("SPEAKING");
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  await speakText(aiResponse.message);
                  console.log(
                    "✅ TTS completed, returning to LISTENING for next question"
                  );
                  setConversationState("LISTENING");
                } else {
                  console.log("No AI response, returning to IDLE");
                  setConversationState("IDLE");
                  startWakeWordListening();
                }
              } catch (err) {
                console.error("AI or TTS error:", err);
                setConversationState("LISTENING");
              }
            })();
          } else {
            console.log("No user text detected, skipping AI call");
            setConversationState("IDLE");
            startWakeWordListening();
          }
        } else {
          console.log("No valid user message found");
          setConversationState("IDLE");
          startWakeWordListening();
        }

        return prevMessages;
      });

      // Clear user transcript and STT data after capturing
      userTranscriptRef.current = "";
      resetSttDatas();
    } catch (err) {
      console.error("Failed to stop recording", err);
      setConversationState("IDLE");
      await startWakeWordListening();
    } finally {
      // Always clear transcript and STT data on exit
      userTranscriptRef.current = "";
      resetSttDatas();
      currentlyAddingMessageRef.current = false;
    }
  };

  // VAD ended event handler
  useEffect(() => {
    if (onVadEnded) {
      onVadEnded((data) => {
        console.log("🎙️ VAD ended in Breathe page:", data);
        if (conversationState === "LISTENING" && isRecording) {
          console.log("Stopping recording due to VAD ended event");
          stopRecording();
        }
      });
    }
  }, [onVadEnded, isRecording, conversationState]);

  // Animated loading dots component
  const LoadingDots = () => {
    const dot1Anim = useRef(new Animated.Value(0)).current;
    const dot2Anim = useRef(new Animated.Value(0)).current;
    const dot3Anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const createDotAnimation = (animValue: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(animValue, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(animValue, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(animValue, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(animValue, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
            ]),
          ])
        );
      };

      const anim1 = createDotAnimation(dot1Anim, 0);
      const anim2 = createDotAnimation(dot2Anim, 200);
      const anim3 = createDotAnimation(dot3Anim, 400);

      anim1.start();
      anim2.start();
      anim3.start();

      return () => {
        anim1.stop();
        anim2.stop();
        anim3.stop();
      };
    }, []);

    const getDotStyle = (animValue: Animated.Value) => ({
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "#fff",
      marginHorizontal: 4,
      opacity: animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 1],
      }),
      transform: [
        {
          scale: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1.2],
          }),
        },
      ],
    });

    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Animated.View style={getDotStyle(dot1Anim)} />
        <Animated.View style={getDotStyle(dot2Anim)} />
        <Animated.View style={getDotStyle(dot3Anim)} />
      </View>
    );
  };

  // Show conversation state indicator
  const getStateContent = () => {
    if (conversationState === "IDLE") {
      return <Text style={styles.statusText}>보쌤을 불러보세요</Text>;
    }
    if (conversationState === "SPEAKING") {
      return <></>;
    }
    if (conversationState === "LISTENING") {
      return <></>;
    }
    return <LoadingDots />;
  };

  // Handle mic button press to change state
  const handleMicButtonPress = async () => {
    console.log("Mic button pressed. Current state:", conversationState);

    switch (conversationState) {
      case "IDLE":
        // IDLE → LISTENING: Turn mic on
        await stopWakeWordListening();
        setConversationState("LISTENING");
        break;

      case "GREETING":
        // GREETING → LISTENING: Turn mic on (skip greeting)
        await stopSpeaking();
        setConversationState("LISTENING");
        break;

      case "LISTENING":
        // LISTENING → PROCESSING: Turn mic off
        if (isRecording) {
          await stopRecording();
        }
        break;

      case "SPEAKING":
        // SPEAKING → LISTENING: Turn mic on (interrupt AI response)
        await stopSpeaking();
        setConversationState("LISTENING");
        break;

      case "PROCESSING":
        // Do nothing when processing
        console.log("Cannot change state while processing");
        break;

      default:
        break;
    }
  };

  const selGame = GAMES.find((g) => g.key === selectedGameKey);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Current Game Info Header - Hidden when messages are expanded */}
      {!isExpanded && (
        <TouchableOpacity
          style={[styles.gameInfoHeader]}
          onPress={() => setShowGameSelection(true)}
          activeOpacity={0.7}
        >
          {selGame?.image && (
            <Image
              source={selGame.image}
              style={styles.gameInfoBackground}
              resizeMode="cover"
            />
          )}
          <View style={styles.gameInfoContent}>
            <Ionicons name="game-controller-outline" size={20} color="#fff" />
            <Text style={styles.gameInfoText}>
              {selectedGameKey
                ? GAMES.find((g) => g.key === selectedGameKey)?.name ||
                  "게임 선택"
                : "게임 선택"}
            </Text>
          </View>
          <Ionicons
            name="chevron-down"
            size={20}
            color="rgba(255,255,255,0.6)"
          />
        </TouchableOpacity>
      )}

      {/* Breathe Animation - Circle position controlled by offsetY */}
      <View style={styles.breatheContainer}>
        <Breathe width={width * breatheScale} offsetY={breatheOffsetY} />
      </View>

      {/* Status Overlay */}
      <View style={styles.statusOverlay}>
        {getStateContent()}

        {/* Mic Button */}
        <View style={styles.micButtonContainer}>
          <MicButton
            conversationState={conversationState}
            onPress={handleMicButtonPress}
          />
        </View>
      </View>

      {/* Messages Container - Expandable */}
      {messages.length > 0 && (
        <>
          {/* Backdrop - closes expanded view when clicked */}
          {isExpanded && (
            <Pressable style={styles.backdrop} onPress={toggleExpanded} />
          )}

          <Animated.View
            style={[
              styles.messagesContainer,
              {
                height: messagesHeight,
              },
            ]}
          >
            <View style={styles.scrollViewContainer}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesScrollView}
                showsVerticalScrollIndicator={false}
                scrollEnabled={isExpanded}
              >
                <Pressable
                  onPress={() => {
                    if (!isExpanded) {
                      toggleExpanded();
                    }
                  }}
                  disabled={isExpanded}
                >
                  {(isExpanded ? messages : messages.slice(-3))
                    .filter((message) => {
                      if (message.isDummy) return false;

                      const messageText = message.textItems
                        .map((item) => item.text)
                        .join(" ")
                        .trim();
                      return messageText.length > 0;
                    })
                    .map((message, index, filteredMessages) => {
                      // Determine if this is the oldest message in collapsed view
                      const isOldestInCollapsedView =
                        !isExpanded &&
                        index === 0 &&
                        filteredMessages.length === 3;

                      return (
                        <View
                          key={message.id}
                          style={[
                            styles.messageBubble,
                            message.isUser
                              ? styles.userMessage
                              : styles.botMessage,
                            isOldestInCollapsedView && styles.fadedMessage,
                          ]}
                        >
                          {isOldestInCollapsedView && (
                            <LinearGradient
                              colors={[
                                "rgba(36, 43, 56, 0.7)",
                                "rgba(36, 43, 56, 0)",
                              ]}
                              style={styles.gradientOverlay}
                              pointerEvents="none"
                            />
                          )}
                          <Text
                            style={[
                              styles.messageText,
                              message.isUser
                                ? styles.userMessageText
                                : styles.botMessageText,
                              isOldestInCollapsedView && styles.fadedText,
                            ]}
                            numberOfLines={isExpanded ? undefined : 2}
                            ellipsizeMode={isExpanded ? undefined : "tail"}
                          >
                            {message.textItems
                              .map((item) => item.text)
                              .join(" ")}
                          </Text>
                          {!message.isUser && message.source && isExpanded && (
                            <TouchableOpacity
                              style={styles.sourceContainer}
                              onPress={() => {
                                const pageNum = parseInt(
                                  message.page || "1",
                                  10
                                );
                                setRulebookPage(pageNum);
                                setShowRulebook(true);

                                if (Platform.OS === "ios" && selectedGameKey) {
                                  WebBrowser.openBrowserAsync(
                                    `${RULEBOOK_URLS[selectedGameKey]}#page=${pageNum}`,
                                    {
                                      showTitle: false,
                                      presentationStyle:
                                        WebBrowser.WebBrowserPresentationStyle
                                          .FORM_SHEET,
                                      controlsColor: "#fff",
                                    }
                                  );
                                }
                              }}
                            >
                              <Ionicons
                                name="document-text-outline"
                                size={12}
                                color="#aaa"
                                style={styles.sourceIcon}
                              />
                              <Text style={styles.sourceText} numberOfLines={1}>
                                {message.source}
                              </Text>
                              {message.page && message.page !== "null" && (
                                <>
                                  <Text
                                    style={styles.sourceSeparator}
                                    numberOfLines={1}
                                  >
                                    {" • "}
                                  </Text>
                                  <TouchableOpacity
                                    onPress={() => {
                                      const pageNum = parseInt(
                                        message.page || "1",
                                        10
                                      );
                                      setRulebookPage(pageNum);
                                      setShowRulebook(true);
                                    }}
                                    hitSlop={{
                                      top: 10,
                                      bottom: 10,
                                      left: 10,
                                      right: 10,
                                    }}
                                  >
                                    <Text style={styles.pageLink}>
                                      p.{message.page}
                                    </Text>
                                  </TouchableOpacity>
                                </>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                </Pressable>
              </ScrollView>

              {/* Top gradient fade */}
              {isExpanded && (
                <LinearGradient
                  colors={["rgba(36, 43, 56, 0.8)", "rgba(36, 43, 56, 0)"]}
                  style={styles.scrollTopGradient}
                  pointerEvents="none"
                />
              )}

              {/* Bottom gradient fade */}
              {isExpanded && (
                <LinearGradient
                  colors={["rgba(36, 43, 56, 0)", "rgba(36, 43, 56, 0.8)"]}
                  style={styles.scrollBottomGradient}
                  pointerEvents="none"
                />
              )}
            </View>
          </Animated.View>
        </>
      )}

      {/* Game Selection Modal */}
      <GameSelectionModal
        visible={showGameSelection}
        selectedGameKey={selectedGameKey}
        onSelect={(gameKey) => {
          ExpoAudioStreamModule.requestPermissionsAsync();
          setSelectedGameKey(gameKey);
          setShowGameSelection(false);
        }}
      />

      {/* 룰북 뷰어 컴포넌트 추가 */}
      <RulebookViewer
        visible={showRulebook}
        gameKey={selectedGameKey || "rummikub"}
        initialPage={rulebookPage}
        onClose={() => setShowRulebook(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#242b38",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  breatheContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  statusOverlay: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  micButtonContainer: {
    marginTop: 20,
  },
  // Unified Messages Container (Expandable)
  messagesContainer: {
    position: "absolute",
    bottom: 140,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    overflow: "hidden",
    zIndex: 2, // Above backdrop
  },
  messagesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  messagesTitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "600",
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  messagesScrollView: {
    flex: 1,
    paddingVertical: 12,
  },
  scrollViewContainer: {
    flex: 1,
    position: "relative",
  },
  scrollTopGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 10,
  },
  scrollBottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 10,
  },
  tapHintContainer: {
    paddingVertical: 12,
    alignItems: "center",
  },
  tapHint: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 11,
    textAlign: "center",
    fontStyle: "italic",
  },
  // Message Bubbles
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden", // For gradient overlay
  },
  fadedMessage: {
    opacity: 0.5,
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  fadedText: {
    opacity: 0.7,
  },
  userMessage: {
    backgroundColor: "rgba(0, 122, 255, 0.85)",
    alignSelf: "flex-end",
  },
  botMessage: {
    backgroundColor: "rgba(51, 51, 51, 0.85)",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#fafaf8",
  },
  userMessageText: {
    color: "#fafaf8",
  },
  botMessageText: {
    color: "#fafaf8",
  },
  sourceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  sourceIcon: {
    marginRight: 2,
  },
  sourceText: {
    color: "#ccc",
    fontSize: 12,
    fontStyle: "italic",
  },
  sourceSeparator: {
    color: "#888",
    fontSize: 12,
    marginHorizontal: 4,
  },
  pageLink: {
    color: "#4A9EFF",
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  // Game Info Header
  gameInfoHeader: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    zIndex: 10,
    overflow: "hidden",
  },
  gameInfoBackground: {
    position: "absolute",
    top: "-460%",
    left: "0%",
    right: 0,
    bottom: 0,
    opacity: 0.4,
  },
  gameInfoContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 1,
  },
  gameInfoText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
