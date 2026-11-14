import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { api, getToken, setToken, signInWithPassword } from "./api";
import { flushLeads, pendingLeads } from "./offline";
import { disableReminders, refreshReminderToken } from "./push";
import type { Me } from "./types";

type State = { status: "loading" } | { status: "out" } | { status: "error"; message: string } | { status: "in"; me: Me };
interface Value {
  state: State;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Leads saved on this phone, waiting for signal. */
  waiting: number;
  /** Tries to send waiting leads now. Returns a short message about what happened. */
  syncNow: () => Promise<string>;
}

const Ctx = createContext<Value | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [waiting, setWaiting] = useState(0);

  const refresh = useCallback(async () => {
    if (!(await getToken())) return setState({ status: "out" });
    // Only show the loading screen the first time. Refreshing after an action must not rebuild the tabs.
    setState((s) => (s.status === "in" ? s : { status: "loading" }));
    try {
      setState({ status: "in", me: await api<Me>("/me") });
    } catch (e) {
      // A 401 already cleared the token and means log in again. Anything else is shown with a Retry button.
      if (!(await getToken())) return setState({ status: "out" });
      setState({ status: "error", message: e instanceof Error ? e.message : "Could not reach Grove." });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const syncNow = useCallback(async () => {
    const r = await flushLeads();
    setWaiting(r.left);
    if (r.sent) await refresh();
    if (r.rejected.length) return `Could not add: ${r.rejected.join("; ")}`;
    if (r.sent) return r.sent === 1 ? "1 saved lead was added." : `${r.sent} saved leads were added.`;
    return r.left ? "Still waiting for a connection." : "Nothing waiting.";
  }, [refresh]);

  const signedIn = state.status === "in";
  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    const run = async () => {
      setWaiting((await pendingLeads()).length);
      const r = await flushLeads();
      if (alive) setWaiting(r.left);
      if (r.sent) refresh();
    };
    run();
    refreshReminderToken();
    const app = AppState.addEventListener("change", (st) => st === "active" && run());
    const net = NetInfo.addEventListener((n) => n.isConnected && run());
    return () => {
      alive = false;
      app.remove();
      net();
    };
  }, [signedIn, refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await signInWithPassword(email, password);
      await refresh();
    },
    [refresh],
  );
  const signOut = useCallback(async () => {
    await disableReminders(); // while the login still works
    await setToken(null);
    setState({ status: "out" });
  }, []);

  return <Ctx.Provider value={{ state, signIn, signOut, refresh, waiting, syncNow }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession needs SessionProvider");
  return v;
}

/** The signed-in workspace data. Only used on screens behind the login gate. */
export function useMe(): Me {
  const { state } = useSession();
  if (state.status !== "in") throw new Error("Not signed in");
  return state.me;
}
