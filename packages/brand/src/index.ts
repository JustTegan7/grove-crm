// Grove brand tokens. One source for the web app and the future iPhone app.
// apps/web/app/globals.css mirrors these; a test in apps/web checks they match.

export const palette = {
  teal: "#0F3D3A",
  lime: "#B8E066",
  leaf: "#7FC28A",
  sea: "#4FB39C",
  sage: "#EEF2EC",
  ink: "#0B1A18",
  white: "#FFFFFF",
  clay: "#C8643C",
  sun: "#E8B33A",
} as const;

export const tokens = {
  light: {
    bg: "#F6F8F4",
    surface: "#FFFFFF",
    surface2: palette.sage,
    border: "#DCE3D8",
    fg: palette.ink,
    muted: "#55645F",
    primary: palette.teal,
    primaryFg: "#FFFFFF",
    accent: palette.lime,
    accentFg: palette.teal,
    mark: palette.lime,
    overdue: palette.clay,
    today: "#B9831A",
  },
  dark: {
    bg: palette.ink,
    surface: "#12241F",
    surface2: "#18302A",
    border: "#24403A",
    fg: "#E8EFE6",
    muted: "#9AB0A8",
    primary: palette.lime,
    primaryFg: palette.teal,
    accent: palette.lime,
    accentFg: palette.teal,
    mark: "rgba(184, 224, 102, 0.35)",
    overdue: "#E58A63",
    today: palette.sun,
  },
  radius: { sm: "8px", md: "12px", lg: "18px", pill: "999px" },
  fonts: { display: "Bricolage Grotesque", body: "Figtree" },
} as const;

/** The three-circle grove mark, as SVG markup (viewBox 0 0 1024 1024). */
export const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="228" fill="${palette.teal}"/><circle cx="642" cy="385" r="215" fill="${palette.lime}"/><circle cx="457" cy="565" r="197" fill="${palette.teal}"/><circle cx="457" cy="565" r="175" fill="${palette.leaf}"/><circle cx="297" cy="725" r="152" fill="${palette.teal}"/><circle cx="297" cy="725" r="130" fill="${palette.sea}"/></svg>`;
