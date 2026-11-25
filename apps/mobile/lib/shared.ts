// Shared with the web app. These files have no dependencies, so the phone uses the exact same rules and colors.
export { addDays, dueLabel, dueState, todayIn } from "../../../packages/core/src/dates";
export { tokens, palette } from "../../../packages/brand/src/index";
export type { StageDef, CadenceStepDef, Channel, Role } from "../../../packages/core/src/types";
export { dialable } from "../../../packages/core/src/phone";
export { firstName, renderMessage } from "../../../packages/core/src/messages";
export { webHref, extractLinks } from "../../../packages/core/src/links";
