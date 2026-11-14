import { router } from "expo-router";
import { Body, Button, Card, Screen } from "../../components/ui";
import { useMe, useSession } from "../../lib/session";

export default function More() {
  const me = useMe();
  const { signOut } = useSession();
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
      <Button kind="soft" title="Sign out" onPress={signOut} />
    </Screen>
  );
}
