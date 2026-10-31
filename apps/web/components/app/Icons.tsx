const P = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const IconMail = () => <svg {...P}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
export const IconPhone = () => <svg {...P}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>;
export const IconText = () => <svg {...P}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
export const IconSun = () => <svg {...P}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
export const IconToday = () => <svg {...P}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
export const IconPipeline = () => <svg {...P}><rect x="3" y="3" width="5" height="18" rx="1" /><rect x="10" y="3" width="5" height="12" rx="1" /><rect x="17" y="3" width="4" height="7" rx="1" /></svg>;
export const IconBiz = () => <svg {...P}><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></svg>;
export const IconTasks = () => <svg {...P}><path d="m9 11 3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
export const IconPlus = () => <svg {...P}><path d="M12 5v14M5 12h14" /></svg>;
export const IconBell = () => <svg {...P}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>;

export function ChannelIcon({ channel }: { channel: "email" | "call" | "text" | null }) {
  if (channel === "email") return <span title="Email" className="text-muted"><IconMail /></span>;
  if (channel === "call") return <span title="Call" className="text-muted"><IconPhone /></span>;
  if (channel === "text") return <span title="Text" className="text-muted"><IconText /></span>;
  return null;
}
