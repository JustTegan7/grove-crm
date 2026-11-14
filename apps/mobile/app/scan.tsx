import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { Button } from "../components/ui";
import { api } from "../lib/api";
import { useTheme } from "../lib/theme";

const PREFIX = "grove://qr/";

export default function Scan() {
  const t = useTheme();
  const [perm, ask] = useCameraPermissions();
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const busy = useRef(false);

  async function onScan(data: string) {
    if (busy.current || done || !data.startsWith(PREFIX)) return;
    busy.current = true;
    try {
      const r = await api<{ message: string }>("/qr/approve", { method: "POST", body: { code: data.slice(PREFIX.length) } });
      setMsg(r.message);
      setDone(true);
      setTimeout(() => router.back(), 1500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "That did not work.");
      setTimeout(() => { busy.current = false; }, 2500);
    }
  }

  if (!perm) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (!perm.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, padding: 24, justifyContent: "center", gap: 14 }}>
        <Text style={{ color: t.fg, fontSize: 18, fontWeight: "700" }}>Camera access</Text>
        <Text style={{ color: t.muted }}>Grove uses the camera only to scan the login code on your computer screen.</Text>
        <Button title="Allow camera" onPress={ask} />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={({ data }) => onScan(data)} />
      <View style={{ position: "absolute", bottom: 40, left: 20, right: 20, backgroundColor: t.surface, borderRadius: 14, padding: 14 }}>
        <Text accessibilityLiveRegion="polite" style={{ color: t.fg, textAlign: "center" }}>{msg ?? "Point at the code on your computer."}</Text>
      </View>
    </View>
  );
}
