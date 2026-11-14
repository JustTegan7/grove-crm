"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { authClient } from "../../lib/auth-client";

/** Shows a QR code. Scanning it in the Grove phone app logs this browser in. */
export function QrLogin({ next }: { next: string }) {
  const router = useRouter();
  const [img, setImg] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "expired" | "error">("loading");
  const [round, setRound] = useState(0);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      setState("loading");
      try {
        const res = await fetch("/api/qr/start", { method: "POST" });
        if (!res.ok) throw new Error();
        const { code, pollSecret } = (await res.json()) as { code: string; pollSecret: string };
        const png = await QRCode.toDataURL(`grove://qr/${code}`, { margin: 1, width: 224 });
        if (stop) return;
        setImg(png);
        setState("ready");
        const poll = async () => {
          if (stop) return;
          const r = await fetch("/api/qr/poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, pollSecret }) });
          const out = (await r.json()) as { status: string; token?: string };
          if (stop) return;
          if (out.status === "approved" && out.token) {
            const v = await authClient.oneTimeToken.verify({ token: out.token });
            if (v.error) return setState("error");
            router.replace(next);
            router.refresh();
            return;
          }
          if (out.status === "expired") return setState("expired");
          timer = setTimeout(poll, 2000);
        };
        timer = setTimeout(poll, 2000);
      } catch {
        if (!stop) setState("error");
      }
    })();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [round, next, router]);

  return (
    <div className="mt-6 text-center">
      <p className="text-sm text-muted">Open Grove on your phone, tap Scan to log in, and point it at this code.</p>
      <div className="mx-auto mt-4 flex h-56 w-56 items-center justify-center rounded-xl border border-line bg-white">
        {state === "ready" && img ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={img} alt="QR code to log in with the Grove phone app" width={224} height={224} /> : <span className="text-sm text-muted">{state === "loading" ? "One sec..." : state === "expired" ? "Code expired" : "Could not load"}</span>}
      </div>
      {(state === "expired" || state === "error") && (
        <button type="button" className="btn btn-soft btn-sm mt-3" onClick={() => setRound((n) => n + 1)}>New code</button>
      )}
    </div>
  );
}
