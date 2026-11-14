import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { Body, Button, Card, Input, Screen } from "../../components/ui";
import { api, setToken } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { useMe, useSession } from "../../lib/session";

export default function More() {
  const me = useMe();
  const { signOut } = useSession();
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api("/account", { method: "DELETE", body: { confirm } });
      await setToken(null);
      await signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Body bold>{me.user.name}</Body>
        <Body small muted>{me.user.email} · {me.user.role}</Body>
        <Body small muted>{me.workspace.name}</Body>
      </Card>
      <Card>
        <Body bold>Log in on your computer</Body>
        <Body small muted>Open Grove in your browser, choose Log in with your phone, then scan the code.</Body>
        <Button title="Scan to log in" onPress={() => router.push("/scan")} />
      </Card>
      <Card>
        <Body bold>Message templates</Body>
        <Body small muted>{me.templates.length} templates. Open any business to copy or send one filled in for them, or tap Copy message on a task. Edit the wording on the web at thegrovecms.com/templates.</Body>
      </Card>
      <Button kind="soft" title="Sign out" onPress={signOut} />
      <Card>
        <Body bold>Delete account</Body>
        <Body small muted>
          Deletes your login. If you are the only person in your workspace, the workspace and everything in it is deleted too. Otherwise your businesses and tasks go to a teammate.
        </Body>
        {!open ? (
          <Button small kind="danger" title="Delete my account" onPress={() => setOpen(true)} />
        ) : (
          <>
            <Input label={`Type ${me.user.email} to confirm`} value={confirm} onChangeText={setConfirm} autoCapitalize="none" keyboardType="email-address" />
            {error && <Text accessibilityRole="alert" style={{ color: t.overdue }}>{error}</Text>}
            <Button kind="danger" title="Permanently delete" busy={busy} disabled={!confirm} onPress={remove} />
            <Button small kind="soft" title="Cancel" onPress={() => { setOpen(false); setConfirm(""); setError(null); }} />
          </>
        )}
      </Card>
    </Screen>
  );
}
