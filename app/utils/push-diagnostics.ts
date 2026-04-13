import Constants from "expo-constants";
import { Platform } from "react-native";
import { API_BASE_URL } from "@/utils/api";

type NotificationModule = typeof import("expo-notifications");

type PushDiagnosticsResult = {
  appOwnership: string;
  platform: string;
  projectId: string;
  permissionStatus: string;
  token: string;
  tokenRegistered: boolean;
  backendRegisteredDevices: number | null;
  backendHealthy: boolean;
  backendMessage: string;
};

let notificationsModulePromise: Promise<NotificationModule | null> | null = null;

async function getNotificationsModule() {
  if (Platform.OS === "web") return null;

  if (!notificationsModulePromise) {
    notificationsModulePromise = import("expo-notifications").catch(() => null);
  }

  return notificationsModulePromise;
}

async function getBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications/health`);
    if (!response.ok) {
      return {
        backendRegisteredDevices: null,
        backendHealthy: false,
        backendMessage: `HTTP ${response.status}`,
      };
    }

    const payload = await response.json();
    return {
      backendRegisteredDevices: Number(payload?.registeredDevices ?? 0),
      backendHealthy: Boolean(payload?.ok),
      backendMessage: payload?.message ? String(payload.message) : "OK",
    };
  } catch (error) {
    return {
      backendRegisteredDevices: null,
      backendHealthy: false,
      backendMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runPushDiagnostics(): Promise<PushDiagnosticsResult> {
  const notifications = await getNotificationsModule();
  const projectId =
    String(Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? "").trim();

  let permissionStatus = "unavailable";
  let token = "";
  let tokenRegistered = false;

  if (notifications) {
    try {
      const permission = await notifications.getPermissionsAsync();
      permissionStatus = String(permission.status || "unknown");

      if (permission.status !== "granted") {
        const requested = await notifications.requestPermissionsAsync();
        permissionStatus = String(requested.status || permission.status || "unknown");
      }

      if (permissionStatus === "granted") {
        const tokenResponse = projectId
          ? await notifications.getExpoPushTokenAsync({ projectId })
          : await notifications.getExpoPushTokenAsync();
        token = String(tokenResponse?.data || "").trim();

        if (token) {
          const response = await fetch(`${API_BASE_URL}/api/notifications/device-token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              token,
              platform: Platform.OS === "android" ? "android" : Platform.OS === "ios" ? "ios" : "unknown",
            }),
          });

          tokenRegistered = response.ok;
        }
      }
    } catch {
      permissionStatus = "error";
    }
  }

  const backend = await getBackendHealth();

  return {
    appOwnership: Constants.appOwnership || "unknown",
    platform: Platform.OS,
    projectId,
    permissionStatus,
    token,
    tokenRegistered,
    backendRegisteredDevices: backend.backendRegisteredDevices,
    backendHealthy: backend.backendHealthy,
    backendMessage: backend.backendMessage,
  };
}