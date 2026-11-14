import * as SecureStore from "expo-secure-store";

// Set EXPO_PUBLIC_API_URL for a preview deploy. Production is thegrovecms.com.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://thegrovecms.com").replace(/\/$/, "");
const KEY = "grove.session";

let cached: string | null | undefined;
export async function getToken() {
  if (cached === undefined) cached = await SecureStore.getItemAsync(KEY);
  return cached;
}
export async function setToken(t: string | null) {
  cached = t;
  if (t) await SecureStore.setItemAsync(KEY, t);
  else await SecureStore.deleteItemAsync(KEY);
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Calls /api/v1 with the stored session token. A 401 clears the token so the app returns to login. */
export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    await setToken(null);
    throw new ApiError("Please log in again.", 401);
  }
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? "Something went wrong.", res.status);
  return data as T;
}

/** Email and password sign-in. Better Auth returns the session token in the set-auth-token header. */
export async function signInWithPassword(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: API_URL },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  const token = res.headers.get("set-auth-token");
  if (!res.ok || !token) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError((data as { message?: string }).message ?? "That did not work. Check your email and password.", res.status);
  }
  await setToken(token);
}
