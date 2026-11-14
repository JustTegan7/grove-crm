import { Linking, Text, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Body, Button, Card } from "./ui";
import { dueLabel, dueState } from "../lib/shared";
import { useTheme } from "../lib/theme";
import type { TaskView } from "../lib/types";

export function TaskCard({ task, today, busy, onComplete, onSnooze, onDecide, onNotice }: {
  task: TaskView;
  today: string;
  busy: boolean;
  onComplete: (id: string) => void;
  onSnooze: (id: string) => void;
  onDecide: (id: string, choice: "recycle" | "dnc") => void;
  onNotice: (msg: string) => void;
}) {
  const t = useTheme();
  const s = dueState(task.dueDate, today);
  const dueColor = s === "overdue" ? t.overdue : s === "today" ? t.today : t.muted;
  const phone = task.contactPhone?.replace(/[^\d+]/g, "");

  async function copy() {
    const m = task.message;
    if (!m) return;
    await Clipboard.setStringAsync(m.subject ? `Subject: ${m.subject}\n\n${m.body}` : m.body);
    onNotice(task.channel === "call" ? "Script copied." : "Message copied.");
  }

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Body bold>{task.title}</Body>
          {task.contactName && task.contactId && (
            <Text onPress={() => router.push(`/business/${task.contactId}`)} style={{ color: t.muted, fontSize: 14 }} accessibilityRole="link">{task.contactName}</Text>
          )}
        </View>
        <Text style={{ color: dueColor, fontWeight: "700", fontSize: 13 }}>{dueLabel(task.dueDate, today)}</Text>
      </View>
      {task.note ? <Body small muted>{task.note}</Body> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
        {task.kind === "decide" ? (
          <>
            <Button small kind="soft" title="Recycle" busy={busy} onPress={() => onDecide(task.id, "recycle")} />
            <Button small kind="danger" title="Do not contact" busy={busy} onPress={() => onDecide(task.id, "dnc")} />
          </>
        ) : (
          <>
            <Button small title="Done" busy={busy} onPress={() => onComplete(task.id)} />
            <Button small kind="soft" title="Tomorrow" busy={busy} onPress={() => onSnooze(task.id)} />
            {task.message && <Button small kind="soft" title={task.channel === "call" ? "Copy script" : "Copy message"} onPress={copy} />}
            {task.channel === "call" && phone && <Button small kind="soft" title="Call" onPress={() => Linking.openURL(`tel:${phone}`)} />}
            {task.channel === "text" && phone && <Button small kind="soft" title="Text" onPress={() => Linking.openURL(`sms:${phone}`)} />}
          </>
        )}
      </View>
    </Card>
  );
}
