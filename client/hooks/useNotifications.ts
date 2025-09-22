import { useState, useEffect, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useNotifications } from "../providers/GlobalProvider";

// Configure how notifications should be handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface UseNotificationsReturn {
  permission: Notifications.NotificationPermissionsStatus | null;
  expoPushToken: string | null;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  scheduleNotification: (
    title: string,
    body: string,
    trigger?: Notifications.NotificationTriggerInput
  ) => Promise<string | null>;
  cancelNotification: (identifier: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
}

export function useNotificationsManager(): UseNotificationsReturn {
  const [permission, setPermission] =
    useState<Notifications.NotificationPermissionsStatus | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useNotifications();

  // Request notification permissions
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        setError("Notification permissions not granted");
        return false;
      }

      setPermission({
        status: finalStatus,
      } as Notifications.NotificationPermissionsStatus);

      // Get push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setExpoPushToken(token);

      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to request notification permissions"
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Schedule a notification
  const scheduleNotification = useCallback(
    async (
      title: string,
      body: string,
      trigger?: Notifications.NotificationTriggerInput
    ): Promise<string | null> => {
      try {
        const hasPermission = await requestPermission();
        if (!hasPermission) {
          return null;
        }

        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: "default",
          },
          trigger: trigger || null,
        });

        // Add to global notifications state
        addNotification({
          title,
          body,
          type: "reminder",
        });

        return identifier;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to schedule notification"
        );
        return null;
      }
    },
    [requestPermission, addNotification]
  );

  // Cancel a specific notification
  const cancelNotification = useCallback(
    async (identifier: string): Promise<void> => {
      try {
        await Notifications.cancelScheduledNotificationAsync(identifier);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to cancel notification"
        );
      }
    },
    []
  );

  // Cancel all notifications
  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to cancel all notifications"
      );
    }
  }, []);

  // Initialize permissions on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Listen for notification responses
  useEffect(() => {
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        // Handle notification tap
        const data = response.notification.request.content.data;
        if (data?.actionUrl) {
          // Navigate to specific screen based on actionUrl
          console.log("Navigate to:", data.actionUrl);
        }
      });

    const receivedListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        // Handle notification received while app is in foreground
        addNotification({
          title: notification.request.content.title || "Notification",
          body: notification.request.content.body || "",
          type: "system",
          data: notification.request.content.data,
        });
      }
    );

    return () => {
      responseListener.remove();
      receivedListener.remove();
    };
  }, [addNotification]);

  return {
    permission,
    expoPushToken,
    loading,
    error,
    requestPermission,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
  };
}

// Hook for scheduling game-related notifications
export function useGameNotifications() {
  const { scheduleNotification } = useNotificationsManager();

  const scheduleGameReminder = useCallback(
    async (gameName: string, sessionTime: Date): Promise<string | null> => {
      const now = new Date();
      const timeDiff = sessionTime.getTime() - now.getTime();

      if (timeDiff <= 0) {
        return null; // Can't schedule notification for past time
      }

      // Schedule 30 minutes before the game
      const reminderTime = new Date(sessionTime.getTime() - 30 * 60 * 1000);

      return await scheduleNotification(
        "게임 세션 알림",
        `${gameName} 게임이 30분 후 시작됩니다!`,
        null // Use immediate scheduling for now
      );
    },
    [scheduleNotification]
  );

  const scheduleWeeklyGameNight = useCallback(
    async (
      dayOfWeek: number, // 0 = Sunday, 1 = Monday, etc.
      hour: number,
      minute: number
    ): Promise<string | null> => {
      return await scheduleNotification(
        "주간 게임나이트",
        "오늘은 보드게임 데이 입니다! 친구들과 함께 게임을 즐겨보세요.",
        null // Use immediate scheduling for now
      );
    },
    [scheduleNotification]
  );

  const scheduleNewGameAlert = useCallback(
    async (gameName: string): Promise<string | null> => {
      return await scheduleNotification(
        "새로운 게임 출시!",
        `${gameName}이(가) 출시되었습니다. 지금 확인해보세요!`,
        null // Use immediate scheduling
      );
    },
    [scheduleNotification]
  );

  return {
    scheduleGameReminder,
    scheduleWeeklyGameNight,
    scheduleNewGameAlert,
  };
}

// Hook for badge management
export function useBadgeManager() {
  const setBadgeCount = useCallback(async (count: number): Promise<void> => {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error("Failed to set badge count:", error);
    }
  }, []);

  const clearBadge = useCallback(async (): Promise<void> => {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error("Failed to clear badge:", error);
    }
  }, []);

  const incrementBadge = useCallback(async (): Promise<void> => {
    try {
      const currentCount = await Notifications.getBadgeCountAsync();
      await Notifications.setBadgeCountAsync(currentCount + 1);
    } catch (error) {
      console.error("Failed to increment badge:", error);
    }
  }, []);

  return {
    setBadgeCount,
    clearBadge,
    incrementBadge,
  };
}
