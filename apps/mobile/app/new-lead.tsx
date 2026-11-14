import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { Button, Input, Screen } from "../components/ui";
import { api } from "../lib/api";
import { useSession } from "../lib/session";
import { useTheme } from "../lib/theme";

export default function NewLead() {
  const t = useTheme();
  const { refresh } = useSession();
  const [f, setF] = useState({ name: "", contactName: "", phone: "", email: "", niche: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ id: string }>("/businesses", { method: "POST", body: f });
      await refresh();
      router.replace(`/business/${r.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Input label="Business name" value={f.name} onChangeText={set("name")} autoFocus />
      <Input label="Contact name" value={f.contactName} onChangeText={set("contactName")} autoComplete="name" />
      <Input label="Phone (start with + for other countries)" value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" autoComplete="tel" placeholder="(425) 555-0123 or +44 20 7946 0958" />
      <Input label="Email" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
      <Input label="Niche" value={f.niche} onChangeText={set("niche")} />
      {error && <Text accessibilityRole="alert" style={{ color: t.overdue }}>{error}</Text>}
      <Button title="Add lead" onPress={save} busy={busy} disabled={!f.name.trim()} />
    </Screen>
  );
}
