import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Body } from "./ui";
import { dueLabel } from "../lib/shared";
import { useTheme } from "../lib/theme";
import type { BusinessRow as Row } from "../lib/types";

export function BusinessRow({ b, today, stageLabel, stageColor }: { b: Row; today: string; stageLabel?: string; stageColor?: string }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${b.name}`}
      onPress={() => router.push(`/business/${b.id}`)}
      style={({ pressed }) => ({ backgroundColor: t.surface, borderColor: t.border, borderWidth: 0.5, borderRadius: 14, padding: 14, opacity: pressed ? 0.8 : 1, gap: 2 })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flex: 1 }}><Body bold>{b.name}</Body></View>
        {b.nextDue && <Text style={{ color: b.nextDue <= today ? t.overdue : t.muted, fontSize: 13, fontWeight: "700" }}>{dueLabel(b.nextDue, today)}</Text>}
      </View>
      <Body small muted>{[b.contactName, b.niche].filter(Boolean).join(" · ") || "No contact yet"}</Body>
      {stageLabel && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: stageColor }} />
          <Body small muted>{stageLabel}</Body>
        </View>
      )}
    </Pressable>
  );
}
