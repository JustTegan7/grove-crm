// The follow-up engine. Pure functions: they take the current state plus
// "today" and return the effects to apply. No stage names appear here;
// behavior comes from the stage fields, so per-industry templates just work.

import { addDays, maxYmd, type Ymd } from "./dates";
import type { CadenceStepDef, Channel, ContactState, Effects, NewTask, OpenTask, StageDef } from "./types";

const CHANNEL_VERB: Record<Channel, string> = { email: "Email", call: "Call", text: "Text" };

export const DECIDE_TITLE = "Decide: recycle or do not contact?";

function empty(message = ""): Effects {
  return { createTasks: [], cancelTaskIds: [], contactPatch: {}, activities: [], message };
}

function sortSteps(steps: CadenceStepDef[]) {
  return [...steps].sort((a, b) => a.position - b.position);
}

function sortStages(stages: StageDef[]) {
  return [...stages].sort((a, b) => a.position - b.position);
}

export function followupTask(step: CadenceStepDef, startedOn: Ymd, today: Ymd, ownerId: string): NewTask {
  return {
    kind: "followup",
    channel: step.channel,
    title: `Day ${step.day} ${CHANNEL_VERB[step.channel].toLowerCase()}`,
    dueDate: maxYmd(addDays(startedOn, step.day - 1), today),
    cadenceStepId: step.id,
    ownerId,
  };
}

export function decideTask(today: Ymd, ownerId: string): NewTask {
  return { kind: "decide", channel: null, title: DECIDE_TITLE, dueDate: today, cadenceStepId: null, ownerId };
}

function clientTask(today: Ymd, days: number, ownerId: string): NewTask {
  return { kind: "client", channel: null, title: "Client check-in", dueDate: addDays(today, days), cadenceStepId: null, ownerId };
}

function startCadence(contact: ContactState, steps: CadenceStepDef[], today: Ymd, startedOn: Ymd = today): Effects {
  const first = sortSteps(steps)[0];
  const fx = empty("Follow-ups scheduled.");
  fx.contactPatch = { cadenceActive: Boolean(first), cadenceDone: [], cadenceStartedOn: startedOn };
  if (first) fx.createTasks.push(followupTask(first, startedOn, today, contact.ownerId));
  return fx;
}

/**
 * A brand-new record. `startedOn` is Day 1 of the cadence, normally today.
 * Imports pass the lead's original created date; the next step is still never due before today.
 */
export function onCreate(contact: ContactState, stage: StageDef, steps: CadenceStepDef[], today: Ymd, startedOn: Ymd = today): Effects {
  if (stage.cadenceBehavior === "start") return startCadence(contact, steps, today, startedOn);
  const fx = stageEntryEffects(contact, stage, [], today);
  return fx;
}

/** Tasks and patches from entering a stage that are not about the cadence. */
function stageEntryEffects(contact: ContactState, to: StageDef, openTasks: OpenTask[], today: Ymd): Effects {
  const fx = empty();
  if (to.clearsTasks || to.resurfaceDays != null) {
    fx.cancelTaskIds.push(...openTasks.map((t) => t.id));
  }
  if (to.checkinDays != null) {
    fx.createTasks.push(clientTask(today, contact.checkinFrequencyDays ?? to.checkinDays, contact.ownerId));
  }
  if (to.resurfaceDays != null) {
    fx.createTasks.push({
      kind: "resurface",
      channel: null,
      title: "Resurface: worth another try?",
      dueDate: addDays(today, to.resurfaceDays),
      cadenceStepId: null,
      ownerId: contact.ownerId,
    });
  }
  return fx;
}

function merge(a: Effects, b: Effects): Effects {
  return {
    createTasks: [...a.createTasks, ...b.createTasks],
    cancelTaskIds: [...new Set([...a.cancelTaskIds, ...b.cancelTaskIds])],
    contactPatch: { ...a.contactPatch, ...b.contactPatch },
    activities: [...a.activities, ...b.activities],
    message: b.message || a.message,
  };
}

/** Moving a record from one stage to another. */
export function onStageChange(args: {
  contact: ContactState;
  from: StageDef;
  to: StageDef;
  openTasks: OpenTask[];
  steps: CadenceStepDef[];
  today: Ymd;
}): Effects {
  const { contact, from, to, openTasks, steps, today } = args;
  if (from.id === to.id) return empty();

  let fx = empty();
  fx.contactPatch.stageId = to.id;
  fx.activities.push({ type: "stage", body: `Moved from ${from.label} to ${to.label}` });

  // Leaving a check-in stage removes pending check-ins.
  if (from.checkinDays != null) {
    fx.cancelTaskIds.push(...openTasks.filter((t) => t.kind === "client").map((t) => t.id));
  }
  // Leaving a parked stage removes a pending resurface reminder.
  if (from.resurfaceDays != null) {
    fx.cancelTaskIds.push(...openTasks.filter((t) => t.kind === "resurface").map((t) => t.id));
  }

  if (to.cadenceBehavior === "stop") {
    fx.cancelTaskIds.push(...openTasks.filter((t) => t.kind === "followup" || t.kind === "decide").map((t) => t.id));
    fx.contactPatch.cadenceActive = false;
    if (contact.cadenceActive) fx.message = "Automatic follow-ups stopped, you take it from here.";
  } else if (to.cadenceBehavior === "start" && !contact.cadenceActive) {
    fx.cancelTaskIds.push(...openTasks.filter((t) => t.kind === "decide").map((t) => t.id));
    fx = merge(fx, startCadence(contact, steps, today));
    fx.message = "Follow-ups restarted from today.";
  }

  fx = merge(fx, stageEntryEffects(contact, to, openTasks, today));
  if (to.clearsTasks && !fx.message) fx.message = "All pending tasks cleared.";
  if (to.checkinDays != null) fx.message = "Client check-ins scheduled.";
  if (to.resurfaceDays != null) fx.message = `Parked. It comes back as a task in ${to.resurfaceDays} days.`;
  if (!fx.message) fx.message = `Moved to ${to.label}.`;
  return fx;
}

/** Completing a task. */
export function onComplete(args: {
  task: OpenTask;
  contact: ContactState;
  stages: StageDef[];
  steps: CadenceStepDef[];
  today: Ymd;
}): Effects {
  const { task, contact, stages, steps, today } = args;
  const fx = empty("Done.");

  if (task.kind === "followup" && task.cadenceStepId) {
    const ordered = sortSteps(steps);
    const done = [...new Set([...contact.cadenceDone, task.cadenceStepId])];
    fx.contactPatch.cadenceDone = done;

    // First touch moves a fresh lead to the next active stage.
    const stage = stages.find((s) => s.id === contact.stageId);
    if (stage?.isDefaultNew) {
      const next = sortStages(stages).find((s) => s.group === "active" && s.position > stage.position);
      if (next) {
        fx.contactPatch.stageId = next.id;
        fx.activities.push({ type: "stage", body: `Moved from ${stage.label} to ${next.label}` });
      }
    }

    const nextStep = ordered.find((s) => !done.includes(s.id));
    if (nextStep && contact.cadenceStartedOn) {
      const t = followupTask(nextStep, contact.cadenceStartedOn, today, contact.ownerId);
      fx.createTasks.push(t);
      fx.message = `Done. Next: Day ${nextStep.day} ${nextStep.channel}.`;
    } else {
      fx.createTasks.push(decideTask(today, contact.ownerId));
      fx.message = "Cadence finished. Decide: recycle or do not contact.";
    }
  }

  if (task.kind === "client") {
    const stage = stages.find((s) => s.id === contact.stageId);
    const days = contact.checkinFrequencyDays ?? stage?.checkinDays ?? null;
    if (days != null && stage?.checkinDays != null) {
      fx.createTasks.push(clientTask(today, days, contact.ownerId));
      fx.message = "Done. Next check-in scheduled.";
    }
  }

  return fx;
}

/** The customer replied: stop the cadence and hand it to a person. */
export function onReplied(args: {
  contact: ContactState;
  stages: StageDef[];
  openTasks: OpenTask[];
  steps: CadenceStepDef[];
  today: Ymd;
}): Effects {
  const { contact, stages, openTasks, steps, today } = args;
  const from = stages.find((s) => s.id === contact.stageId);
  const target = sortStages(stages).find((s) => s.group === "active" && s.cadenceBehavior === "stop");
  if (!from || !target) return empty();
  const fx =
    from.id === target.id
      ? { ...empty(), cancelTaskIds: openTasks.filter((t) => t.kind === "followup" || t.kind === "decide").map((t) => t.id), contactPatch: { cadenceActive: false } }
      : onStageChange({ contact, from, to: target, openTasks, steps, today });
  fx.activities.unshift({ type: "reply", body: "They replied" });
  fx.message = "Nice. Follow-ups stopped, you take it from here.";
  return fx;
}

/** Snooze to tomorrow. */
export function snoozeDate(today: Ymd): Ymd {
  return addDays(today, 1);
}
