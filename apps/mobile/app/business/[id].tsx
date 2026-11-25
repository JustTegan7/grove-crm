import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Body, Button, Card, Chip, Empty, Input, Screen } from "../../components/ui";
import { api, upload } from "../../lib/api";
import { dueLabel, extractLinks, firstName, renderMessage, webHref } from "../../lib/shared";
import { callLink, mailLink, open, smsLink } from "../../lib/links";
import { useMe, useSession } from "../../lib/session";
import { useTheme } from "../../lib/theme";
import type { BusinessDetail } from "../../lib/types";

export default function BusinessScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { refresh } = useSession();
  const t = useTheme();
  const [d, setD] = useState<BusinessDetail | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setD(await api<BusinessDetail>(`/businesses/${id}`));
      api<{ files: { id: string; name: string }[] }>(`/businesses/${id}/files`).then((r) => setFiles(r.files)).catch(() => {});
      setLoadError(null);
    } catch (e) {
      // Keep the error on screen, with a retry, instead of falling back to "Loading..." forever.
      setLoadError(e instanceof Error ? e.message : "Could not load this business.");
    }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  async function run(path: string, body?: unknown) {
    setBusy(true);
    try {
      const r = await api<{ message?: string }>(`/businesses/${id}${path}`, { method: "POST", body: body ?? {} });
      if (r.message) setNotice(r.message);
      await Promise.all([load(), refresh()]);
      return true;
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "That did not work.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addPhoto(source: "camera" | "library") {
    try {
      const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return setNotice("Allow access in Settings to add photos.");
      // Quality 0.5 keeps a phone photo well under the 4 MB upload limit.
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.5 };
      const r = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets[0]) return;
      const a = r.assets[0];
      setBusy(true);
      await upload(`/businesses/${id}/files`, { uri: a.uri, name: a.fileName ?? `photo-${Date.now()}.jpg`, type: a.mimeType ?? "image/jpeg" });
      setNotice("Photo added.");
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not add that photo.");
    } finally {
      setBusy(false);
    }
  }

  if (!d) {
    return (
      <Screen>
        <Empty text={loadError ?? "Loading..."} />
        {loadError && <Button title="Try again" onPress={() => { setLoadError(null); load(); }} />}
      </Screen>
    );
  }
  const c = d.contact;
  const stage = me.stages.find((s) => s.id === c.stageId);
  const owner = me.members.find((m) => m.id === c.ownerId);

  return (
    <Screen>
      <Body bold>{c.name}</Body>
      <Body small muted>{[c.niche, c.tier, owner && `Owner: ${owner.name}`].filter(Boolean).join(" · ")}</Body>
      {notice && <Text accessibilityLiveRegion="polite" style={{ color: t.fg, backgroundColor: t.surface2, padding: 10, borderRadius: 10 }}>{notice}</Text>}

      <Card>
        <Body small muted>Contact</Body>
        <Body>{[c.contactName, c.contactRole].filter(Boolean).join(", ") || "No contact name yet"}</Body>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {c.phone && <Button small title="Call" onPress={() => open(callLink(c.phone!))} />}
          {c.phone && <Button small kind="soft" title="Text" onPress={() => open(smsLink(c.phone!))} />}
          {c.email && <Button small kind="soft" title="Email" onPress={() => open(mailLink(c.email!))} />}
          {webHref(c.website) && <Button small kind="soft" title="Website" onPress={() => open(webHref(c.website)!).catch(() => setNotice("Could not open that site."))} />}
        </View>
        {c.phone && <Body small muted>{c.phone}</Body>}
        {c.email && <Body small muted>{c.email}</Body>}
        {c.social && <Body small muted>{c.social}</Body>}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {extractLinks(c.social).map((l) => <Button key={l.href} small kind="soft" title={l.label} onPress={() => open(l.href).catch(() => setNotice("Could not open that link."))} />)}
        </View>
      </Card>

      <Card>
        <Body small muted>Stage: {stage?.label}</Body>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {me.stages.map((s) => <Chip key={s.id} label={s.label} color={s.color} on={s.id === c.stageId} onPress={() => s.id !== c.stageId && run("/stage", { stageId: s.id })} />)}
        </View>
        {stage?.cadenceBehavior === "start" && <Button small kind="soft" title="They replied" busy={busy} onPress={() => run("/replied")} />}
      </Card>

      <Card>
        <Body small muted>Open tasks</Body>
        {d.openTasks.length === 0 ? <Body small muted>Nothing scheduled.</Body> : d.openTasks.map((x) => (
          <View key={x.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Body>{x.title}</Body>
            <Body small muted>{dueLabel(x.dueDate, me.today)}</Body>
          </View>
        ))}
      </Card>

      <Card>
        <Body small muted>Photos and files ({files.length})</Body>
        {files.slice(0, 5).map((f) => <Body key={f.id} small>{f.name}</Body>)}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
          <Button small title="Take photo" disabled={busy} onPress={() => addPhoto("camera")} />
          <Button small kind="soft" title="Choose photo" disabled={busy} onPress={() => addPhoto("library")} />
        </View>
      </Card>

      {me.templates.length > 0 && (
        <Card>
          <Body small muted>Message templates (filled in for {c.name})</Body>
          {me.templates.map((tpl) => {
            const v = { business: c.name, contact: c.contactName, first_name: firstName(c.contactName), owner: firstName(me.user.name) ?? me.user.name, company: me.workspace.name };
            const body = renderMessage(tpl.body, v);
            const subject = tpl.subject ? renderMessage(tpl.subject, v) : null;
            const canOpen = (tpl.channel === "text" && c.phone) || (tpl.channel === "email" && c.email);
            return (
              <View key={tpl.id} style={{ paddingVertical: 6, gap: 6 }}>
                <Body bold>{tpl.name}</Body>
                <Body small muted>{body.length > 140 ? `${body.slice(0, 140)}...` : body}</Body>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button small kind="soft" title={tpl.channel === "call" ? "Copy script" : "Copy"} onPress={async () => { await Clipboard.setStringAsync(subject ? `Subject: ${subject}\n\n${body}` : body); setNotice("Copied."); }} />
                  {canOpen && <Button small title={tpl.channel === "text" ? "Open in Messages" : "Open in Mail"} onPress={() => open(tpl.channel === "text" ? smsLink(c.phone!, body) : mailLink(c.email!, subject, body))} />}
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {c.notes ? <Card><Body small muted>Notes</Body><Body>{c.notes}</Body></Card> : null}

      <Card>
        <Input label="Log a note" value={note} onChangeText={setNote} multiline style={{ minHeight: 72, textAlignVertical: "top" }} />
        <Button small title="Save note" busy={busy} disabled={!note.trim()} onPress={async () => { if (await run("/activities", { type: "note", body: note })) setNote(""); }} />
      </Card>

      <Card>
        <Body small muted>History</Body>
        {d.history.slice(0, 20).map((h) => (
          <View key={h.id} style={{ paddingVertical: 4 }}>
            <Body small>{h.body}</Body>
            <Body small muted>{h.type} · {new Date(h.createdAt).toLocaleDateString()}</Body>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
