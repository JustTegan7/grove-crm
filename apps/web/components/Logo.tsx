import { palette } from "@grove/brand";

export function GroveMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true" className={className}>
      <rect width="1024" height="1024" rx="228" fill={palette.teal} />
      <circle cx="642" cy="385" r="215" fill={palette.lime} />
      <circle cx="457" cy="565" r="197" fill={palette.teal} />
      <circle cx="457" cy="565" r="175" fill={palette.leaf} />
      <circle cx="297" cy="725" r="152" fill={palette.teal} />
      <circle cx="297" cy="725" r="130" fill={palette.sea} />
    </svg>
  );
}

export function GroveLogo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <GroveMark size={size} />
      <span className="font-display text-xl font-extrabold tracking-tight">grove</span>
    </span>
  );
}
