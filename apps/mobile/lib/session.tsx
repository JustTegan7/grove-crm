import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken, signInWithPassword } from "./api";
import type { Me } from "./types";

type State = { status: "loading" } | { status: "out" } | { status: "error"; message: string } | { status: "in"; me: Me };
interface Value {
  state: State;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<Value | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });

  const refresh = useCallback(async () => {
    if (!(await getToken())) return setState({ status: "out" });
    setState({ status: "loading" });
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

  const signIn = useCallback(
    async (email: string, password: string) => {
      await signInWithPassword(email, password);
      await refresh();
    },
    [refresh],
  );
  const signOut = useCallback(async () => {
    await setToken(null);
    setState({ status: "out" });
  }, []);

  return <Ctx.Provider value={{ state, signIn, signOut, refresh }}>{children}</Ctx.Provider>;
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
