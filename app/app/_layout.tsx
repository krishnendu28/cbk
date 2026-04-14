import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AppState, Linking, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { io } from 'socket.io-client';
import { SessionProvider } from '@/context/session-context';
import { initializeAdMob } from '@/utils/admob';
import { checkForPlayStoreUpdate } from '@/utils/update-check';
import { API_BASE_URL } from '@/utils/api';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

const LAST_DISMISSED_RELEASE_KEY = 'cbk_last_dismissed_playstore_version';

type UpdatePromptState = {
  visible: boolean;
  latestVersion: string;
  storeAppUrl: string;
  storeUrl: string;
};

type ExpoNotificationsModule = typeof import('expo-notifications');
let notificationsModulePromise: Promise<ExpoNotificationsModule | null> | null = null;

export const socket = io(API_BASE_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
});

async function getNotificationsModule() {
  if (Platform.OS === 'web') return null;

  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications')
      .then((notifications) => {
        notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
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
  if (Constants.appOwnership === 'expo') {
    console.warn('push_token_registration_skipped_expo_go');
    return;
  }

  const notifications = await getNotificationsModule();
  if (!notifications) {
    console.warn('push_token_registration_failed_no_module');
    return;
  }

  const allowed = await ensureBroadcastNotificationSetup();
  if (!allowed) {
    console.warn('push_token_registration_failed_no_permission');
    return;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  let token: string;
  try {
    const tokenResponse = projectId
      ? await notifications.getExpoPushTokenAsync({ projectId })
      : await notifications.getExpoPushTokenAsync();
    token = String(tokenResponse?.data || '').trim();
  } catch (error) {
    console.warn('push_token_registration_failed_get_token', error);
    return;
  }

  if (!token) {
    console.warn('push_token_registration_failed_empty_token');
    return;
  }

  try {
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
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    console.log('push_token_registration_success');
  } catch (error) {
    console.warn('push_token_registration_failed_post', error);
    throw error;
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
  const [updatePrompt, setUpdatePrompt] = useState<UpdatePromptState>({
    visible: false,
    latestVersion: '',
    storeAppUrl: '',
    storeUrl: '',
  });

  async function handleDismissUpdatePrompt() {
    if (updatePrompt.latestVersion) {
      await AsyncStorage.setItem(LAST_DISMISSED_RELEASE_KEY, updatePrompt.latestVersion);
    }

    setUpdatePrompt({
      visible: false,
      latestVersion: '',
      storeAppUrl: '',
      storeUrl: '',
    });
  }

  async function handleOpenUpdateUrl() {
    if (!updatePrompt.storeAppUrl && !updatePrompt.storeUrl) return;

    try {
      const canOpenStoreApp = updatePrompt.storeAppUrl
        ? await Linking.canOpenURL(updatePrompt.storeAppUrl)
        : false;

      if (canOpenStoreApp && updatePrompt.storeAppUrl) {
        await Linking.openURL(updatePrompt.storeAppUrl);
      } else if (updatePrompt.storeUrl) {
        await Linking.openURL(updatePrompt.storeUrl);
      }

      await handleDismissUpdatePrompt();
    } catch {
      // no-op
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function checkForUpdatesOnLaunch() {
      try {
        const update = await checkForPlayStoreUpdate();
        if (cancelled || !update.hasUpdate || !update.storeUrl) return;

        const dismissedTag = await AsyncStorage.getItem(LAST_DISMISSED_RELEASE_KEY);
        if (dismissedTag && dismissedTag === update.latestVersion) return;

        setUpdatePrompt({
          visible: true,
          latestVersion: update.latestVersion,
          storeAppUrl: update.storeAppUrl,
          storeUrl: update.storeUrl,
        });
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
    if (Constants.appOwnership === 'expo') {
      console.warn('admob_skipped_expo_go');
    } else {
      initializeAdMob().catch(() => undefined);
    }

    registerPushTokenWithBackend().catch((error) => {
      console.warn('push_token_registration_failed', error);
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      registerPushTokenWithBackend().catch((error) => {
        console.warn('push_token_registration_retry_failed', error);
      });
    });

    const onBroadcastNotification = (payload: { message?: string }) => {
      const message = String(payload?.message || '').trim();
      if (!message) return;

      showBroadcastTaskbarNotification(message).catch(() => undefined);
    };

    socket.on('broadcast_notification', onBroadcastNotification);

    return () => {
      appStateSubscription.remove();
      socket.off('broadcast_notification', onBroadcastNotification);
    };
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />

        <Modal
          visible={updatePrompt.visible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            handleDismissUpdatePrompt().catch(() => undefined);
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.45)',
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 20,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 420,
                backgroundColor: '#ffffff',
                borderRadius: 16,
                padding: 18,
                gap: 14,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f172a' }}>Update Available</Text>
              <Text style={{ color: '#334155', fontSize: 15, lineHeight: 22 }}>
                A new app version ({updatePrompt.latestVersion}) is available on Play Store.
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                <Pressable
                  onPress={() => {
                    handleDismissUpdatePrompt().catch(() => undefined);
                  }}
                  style={{
                    backgroundColor: '#e2e8f0',
                    borderRadius: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text style={{ color: '#0f172a', fontWeight: '600' }}>Later</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    handleOpenUpdateUrl().catch(() => undefined);
                  }}
                  style={{
                    backgroundColor: '#16a34a',
                    borderRadius: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>Update</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ThemeProvider>
    </SessionProvider>
  );
}
