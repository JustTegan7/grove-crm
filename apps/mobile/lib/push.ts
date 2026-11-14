import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

async function tokenOrNull(): Promise<string | null> {
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
  const t = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return t.data;
}

/** Asks for permission (the person tapped the button) and registers this phone. Returns a message to show. */
export async function enableReminders(): Promise<string> {
  try {
    if (!Device.isDevice) return "Reminders only work on a real phone.";
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return "Reminders are off. You can allow them in Settings, Notifications, Grove.";
    const token = await tokenOrNull();
    if (!token) return "Could not set up reminders on this phone.";
    await api("/devices", { method: "POST", body: { token, platform: Platform.OS } });
    return "Daily reminders are on.";
  } catch (e) {
    return e instanceof Error ? e.message : "Could not turn reminders on.";
  }
}

/** If reminders were already allowed, quietly keeps this phone's token fresh. Never prompts and never throws. */
export async function refreshReminderToken() {
  try {
    if (!Device.isDevice) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    const token = await tokenOrNull();
    if (token) await api("/devices", { method: "POST", body: { token, platform: Platform.OS } });
  } catch {
    // Reminders are a convenience. A failure here must not affect the app.
  }
}

/** Stops reminders to this phone, for example when signing out. */
export async function disableReminders() {
  try {
    const token = await tokenOrNull();
    if (token) await api("/devices", { method: "DELETE", body: { token } });
  } catch {
    // Best effort.
  }
}
