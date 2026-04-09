import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Alert, Linking, Platform } from 'react-native';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import * as Notifications from 'expo-notifications';
import { SessionProvider } from '@/context/session-context';
import { checkForGithubReleaseUpdate } from '@/utils/update-check';
import { API_BASE_URL } from '@/utils/api';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

const LAST_DISMISSED_RELEASE_KEY = 'cbk_last_dismissed_release_tag';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const socket = io(API_BASE_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
});

async function ensureBroadcastNotificationSetup() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('broadcast', {
      name: 'Broadcast Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D4A017',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    });
  }

  const permission = await Notifications.getPermissionsAsync();
  if (permission.status === 'granted') return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

async function showBroadcastTaskbarNotification(message: string) {
  const allowed = await ensureBroadcastNotificationSetup();
  if (!allowed) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Message From Chakhna',
      body: message,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
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
    ensureBroadcastNotificationSetup().catch(() => undefined);

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
