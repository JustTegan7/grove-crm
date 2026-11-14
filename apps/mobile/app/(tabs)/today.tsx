import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";
import { router, useFocusEffect, Stack } from "expo-router";
import { Body, Button, Chip, Empty, H1, Screen } from "../../components/ui";
import { TaskCard } from "../../components/TaskCard";
import { api } from "../../lib/api";
import { useMe, useSession } from "../../lib/session";
import { useTheme } from "../../lib/theme";
import type { TaskView } from "../../lib/types";

export default function Today() {
  const me = useMe();
  const { refresh } = useSession();
  const t = useTheme();
  const [tasks, setTasks] = useState<TaskView[] | null>(null);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // After tapping Call, Text or Email we ask, on returning to Grove, whether to mark that task done.
  const [opened, setOpened] = useState<TaskView | null>(null);
  const [asking, setAsking] = useState<TaskView | null>(null);
  const openedAt = useRef(0);

  const load = useCallback(async () => {
    try {
      const r = await api<{ tasks: TaskView[] }>(`/tasks?scope=${scope}`);
      setTasks(r.tasks);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not load tasks.");
    }
  }, [scope]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active" && opened && Date.now() - openedAt.current > 2500) {
        setAsking(opened);
        setOpened(null);
      }
    });
    return () => sub.remove();
  }, [opened]);

  async function act(id: string, path: string, body?: unknown) {
    setBusyId(id);
    try {
      const r = await api<{ message?: string }>(path, { method: "POST", body: body ?? {} });
      if (r.message) setNotice(r.message);
      await Promise.all([load(), refresh()]);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusyId(null);
    }
  }

  const list = tasks ?? [];
  const groups: [string, TaskView[]][] = [
    ["Overdue", list.filter((x) => x.dueDate < me.today)],
    ["Today", list.filter((x) => x.dueDate === me.today)],
    ["Coming up", list.filter((x) => x.dueDate > me.today)],
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen onRefresh={async () => { setRefreshing(true); await Promise.all([load(), refresh()]); setRefreshing(false); }} refreshing={refreshing}>
        <H1>Hi {me.user.name.split(" ")[0]}</H1>
        <Body muted>{me.workspace.name}</Body>
        {notice && <Text accessibilityLiveRegion="polite" style={{ color: t.fg, backgroundColor: t.surface2, padding: 10, borderRadius: 10 }}>{notice}</Text>}
        {asking && (
          <View style={{ backgroundColor: t.surface2, borderRadius: 14, padding: 14, gap: 8 }}>
            <Body bold>Finished with {asking.contactName ?? "that task"}?</Body>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button small title="Mark done" onPress={() => { const id = asking.id; setAsking(null); act(id, `/tasks/${id}/complete`); }} />
              <Button small kind="soft" title="Not yet" onPress={() => setAsking(null)} />
            </View>
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip label="My tasks" on={scope === "mine"} onPress={() => setScope("mine")} />
          <Chip label="Whole team" on={scope === "all"} onPress={() => setScope("all")} />
        </View>
        {tasks === null ? <Empty text="Loading..." /> : list.length === 0 ? <Empty text="Nothing due. Nice." /> : null}
        {groups.map(([label, items]) =>
          items.length ? <GroupSection key={label} label={label} items={items} today={me.today} busyId={busyId} act={act} setNotice={setNotice} onOpened={(task) => { openedAt.current = Date.now(); setOpened(task); }} /> : null,
        )}
        <Button title="New lead" kind="soft" onPress={() => router.push("/new-lead")} />
      </Screen>
    </>
  );
}

function GroupSection({ label, items, today, busyId, act, setNotice, onOpened }: { label: string; items: TaskView[]; today: string; busyId: string | null; act: (id: string, path: string, body?: unknown) => void; setNotice: (m: string) => void; onOpened: (t: TaskView) => void }) {
  const t = useTheme();
  return (
    <>
      <Text accessibilityRole="header" style={{ color: t.muted, fontWeight: "700", marginTop: 8 }}>{label} ({items.length})</Text>
      {items.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          today={today}
          busy={busyId === task.id}
          onComplete={(id) => act(id, `/tasks/${id}/complete`)}
          onSnooze={(id) => act(id, `/tasks/${id}/snooze`)}
          onDecide={(id, choice) => act(id, `/tasks/${id}/decide`, { choice })}
          onNotice={setNotice}
          onOpened={onOpened}
        />
      ))}
    </>
  );
}
