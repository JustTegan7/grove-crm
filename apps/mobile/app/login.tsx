import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { Button, Input } from "../components/ui";
import { useSession } from "../lib/session";
import { useTheme } from "../lib/theme";

export default function Login() {
  const t = useTheme();
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: t.bg, justifyContent: "center", padding: 24 }}>
      <View style={{ gap: 14 }}>
        <Text style={{ color: t.fg, fontSize: 34, fontWeight: "800" }}>Grove</Text>
        <Text style={{ color: t.muted, fontSize: 16 }}>A CRM with nothing in the way.</Text>
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
        {error && <Text accessibilityRole="alert" style={{ color: t.overdue }}>{error}</Text>}
        <Button title="Log in" onPress={submit} busy={busy} disabled={!email || !password} />
        <Text style={{ color: t.muted, fontSize: 13 }}>New here? Ask your workspace owner to invite you, then create your login at thegrovecms.com.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}
