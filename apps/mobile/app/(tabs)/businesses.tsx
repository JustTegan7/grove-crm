import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { router, useFocusEffect, Stack } from "expo-router";
import { Button, Empty, Input, Screen } from "../../components/ui";
import { BusinessRow } from "../../components/BusinessRow";
import { api } from "../../lib/api";
import { useMe } from "../../lib/session";
import type { BusinessRow as Row } from "../../lib/types";

export default function Businesses() {
  const me = useMe();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = useCallback(async (term: string) => {
    const r = await api<{ businesses: Row[] }>(`/businesses?sort=name&q=${encodeURIComponent(term)}`);
    setRows(r.businesses);
  }, []);
  // Wait for a pause in typing before searching.
  useEffect(() => {
    const id = setTimeout(() => { load(q).catch(() => setRows([])); }, 250);
    return () => clearTimeout(id);
  }, [q, load]);
  useFocusEffect(useCallback(() => { load(q).catch(() => {}); }, [load, q]));

  return (
    <>
      <Stack.Screen options={{ title: "Businesses" }} />
      <Screen>
        <Input label="Search" value={q} onChangeText={setQ} placeholder="Name, niche, contact or phone" autoCapitalize="none" returnKeyType="search" />
        <View><Button small kind="soft" title="New lead" onPress={() => router.push("/new-lead")} /></View>
        {rows === null ? <Empty text="Loading..." /> : rows.length === 0 ? <Empty text="No businesses found." /> : rows.map((b) => {
          const s = me.stages.find((x) => x.id === b.stageId);
          return <BusinessRow key={b.id} b={b} today={me.today} stageLabel={s?.label} stageColor={s?.color} />;
        })}
      </Screen>
    </>
  );
}
