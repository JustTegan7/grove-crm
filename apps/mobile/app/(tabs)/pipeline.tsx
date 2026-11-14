import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { useFocusEffect, Stack } from "expo-router";
import { Chip, Empty, Screen } from "../../components/ui";
import { BusinessRow } from "../../components/BusinessRow";
import { api } from "../../lib/api";
import { useMe } from "../../lib/session";
import { useTheme } from "../../lib/theme";
import type { BusinessRow as Row } from "../../lib/types";

export default function Pipeline() {
  const me = useMe();
  const t = useTheme();
  const [stageId, setStageId] = useState(me.stages.find((s) => s.isDefaultNew)?.id ?? me.stages[0]?.id);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!stageId) return;
    const r = await api<{ businesses: Row[] }>(`/businesses?stageId=${stageId}`);
    setRows(r.businesses);
  }, [stageId]);
  useFocusEffect(useCallback(() => { load().catch(() => setRows([])); }, [load]));

  const stage = me.stages.find((s) => s.id === stageId);
  return (
    <>
      <Stack.Screen options={{ title: "Pipeline" }} />
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: t.bg }} contentContainerStyle={{ padding: 12, gap: 8 }}>
          {me.stages.map((s) => <Chip key={s.id} label={s.label} color={s.color} on={s.id === stageId} onPress={() => { setRows(null); setStageId(s.id); }} />)}
        </ScrollView>
        <Screen onRefresh={async () => { setRefreshing(true); await load().catch(() => {}); setRefreshing(false); }} refreshing={refreshing}>
          {rows === null ? <Empty text="Loading..." /> : rows.length === 0 ? <Empty text={`Nobody in ${stage?.label ?? "this stage"} yet.`} /> : rows.map((b) => <BusinessRow key={b.id} b={b} today={me.today} />)}
        </Screen>
      </View>
    </>
  );
}
