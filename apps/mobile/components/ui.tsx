import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../lib/theme";

export function Screen({ children, onRefresh, refreshing = false, padBottom = 24 }: { children: React.ReactNode; onRefresh?: () => void; refreshing?: boolean; padBottom?: number }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: padBottom + insets.bottom, gap: 12 }}
      keyboardShouldPersistTaps="handled"
      // Scrolling or dragging down puts the keyboard away, and the screen lifts so the field stays visible.
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      automaticallyAdjustKeyboardInsets
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.muted} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.surface, borderColor: t.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, gap: 6 }, style]}>{children}</View>;
}

export function H1({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={{ color: t.fg, fontSize: 28, fontWeight: "800" }}>{children}</Text>;
}

export function Body({ children, muted, small, bold }: { children: React.ReactNode; muted?: boolean; small?: boolean; bold?: boolean }) {
  const t = useTheme();
  return <Text style={{ color: muted ? t.muted : t.fg, fontSize: small ? 13 : 16, fontWeight: bold ? "700" : "400" }}>{children}</Text>;
}

export function Button({ title, onPress, kind = "primary", disabled, busy, small }: { title: string; onPress: () => void; kind?: "primary" | "soft" | "danger"; disabled?: boolean; busy?: boolean; small?: boolean }) {
  const t = useTheme();
  const bg = kind === "primary" ? t.primary : kind === "danger" ? t.overdue : t.surface2;
  const fg = kind === "soft" ? t.fg : kind === "danger" ? "#FFFFFF" : t.primaryFg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => ({ backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1, paddingVertical: small ? 8 : 13, paddingHorizontal: small ? 12 : 16, borderRadius: 12, alignItems: "center", minHeight: small ? 36 : 48, justifyContent: "center" })}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: "700", fontSize: small ? 14 : 16 }}>{title}</Text>}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label: string }) {
  const t = useTheme();
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: t.muted, fontSize: 13, fontWeight: "600" }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={t.muted}
        returnKeyType={rest.multiline ? "default" : "done"}
        style={[{ backgroundColor: t.surface, color: t.fg, borderColor: t.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 }, style]}
        {...rest}
      />
    </View>
  );
}

export function Chip({ label, on, onPress, color }: { label: string; on?: boolean; onPress?: () => void; color?: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!on }} style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: on ? t.primary : t.surface2, flexDirection: "row", alignItems: "center", gap: 6 }}>
      {color && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color, borderWidth: 1.5, borderColor: on ? t.primaryFg : t.surface }} />}
      <Text style={{ color: on ? t.primaryFg : t.fg, fontWeight: "600", fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Empty({ text }: { text: string }) {
  const t = useTheme();
  return <Text style={{ color: t.muted, textAlign: "center", paddingVertical: 32 }}>{text}</Text>;
}
