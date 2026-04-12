import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Alert, Linking, Platform } from 'react-native';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { io } from 'socket.io-client';
import { SessionProvider } from '@/context/session-context';
import { checkForGithubReleaseUpdate } from '@/utils/update-check';
import { API_BASE_URL } from '@/utils/api';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

const LAST_DISMISSED_RELEASE_KEY = 'cbk_last_dismissed_release_tag';

type ExpoNotificationsModule = typeof import('expo-notifications');
let notificationsModulePromise: Promise<ExpoNotificationsModule | null> | null = null;

export const socket = io(API_BASE_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
});

function isExpoGoRuntime() {
  return Constants.appOwnership === 'expo';
}

async function getNotificationsModule() {
  if (Platform.OS === 'web') return null;

  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications')
      .then((notifications) => {
        notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        return notifications;
      })
      .catch(() => null);
  }

  return notificationsModulePromise;
}

async function ensureBroadcastNotificationSetup() {
  const notifications = await getNotificationsModule();
  if (!notifications) return false;

  if (Platform.OS === 'android') {
    await notifications.setNotificationChannelAsync('broadcast', {
      name: 'Broadcast Notifications',
      importance: notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D4A017',
      lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    });
  }

  const permission = await notifications.getPermissionsAsync();
  if (permission.status === 'granted') return true;

  const requested = await notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

async function registerPushTokenWithBackend() {
  const notifications = await getNotificationsModule();
  if (!notifications) return;

  const allowed = await ensureBroadcastNotificationSetup();
  if (!allowed) return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const tokenResponse = projectId
    ? await notifications.getExpoPushTokenAsync({ projectId })
    : await notifications.getExpoPushTokenAsync();
  const token = String(tokenResponse?.data || '').trim();
  if (!token) return;

  const response = await fetch(`${API_BASE_URL}/api/notifications/device-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      platform: Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'unknown',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to register push token (HTTP ${response.status})`);
  }
}

async function showBroadcastTaskbarNotification(message: string) {
  const notifications = await getNotificationsModule();
  if (!notifications) return;

  const allowed = await ensureBroadcastNotificationSetup();
  if (!allowed) return;

  await notifications.scheduleNotificationAsync({
    content: {
      title: 'Message From Chakhna',
      body: message,
      sound: 'default',
      priority: notifications.AndroidNotificationPriority.MAX,
    },
    trigger: null,
  });
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    let cancelled = false;

    async function checkForUpdatesOnLaunch() {
      try {
        const update = await checkForGithubReleaseUpdate();
        if (cancelled || !update.hasUpdate || !update.releasePageUrl) return;

        const dismissedTag = await AsyncStorage.getItem(LAST_DISMISSED_RELEASE_KEY);
        if (dismissedTag && dismissedTag === update.latestTag) return;

        Alert.alert(
          'Update available',
          `A new version (${update.latestTag}) is available. Please update to continue with the latest fixes and features.`,
          [
            {
              text: 'Later',
              style: 'cancel',
              onPress: () => {
                AsyncStorage.setItem(LAST_DISMISSED_RELEASE_KEY, update.latestTag).catch(() => undefined);
              },
            },
            {
              text: 'Update now',
              onPress: () => {
                Linking.openURL(update.releasePageUrl).catch(() => undefined);
              },
            },
          ],
        );
      } catch {
        // Silent failure: update checks should never block app usage.
      }
    }

    checkForUpdatesOnLaunch();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    registerPushTokenWithBackend().catch((error) => {
      console.warn('push_token_registration_failed', error);
    });

    const onBroadcastNotification = (payload: { message?: string }) => {
      const message = String(payload?.message || '').trim();
      if (!message) return;

      showBroadcastTaskbarNotification(message).catch(() => undefined);
    };

    socket.on('broadcast_notification', onBroadcastNotification);

    return () => {
      socket.off('broadcast_notification', onBroadcastNotification);
    };
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SessionProvider>
  );
}
