import { api, json } from "../../../../lib/api/handler";
import { registerDevice, unregisterDevice } from "../../../../lib/services/devices";

// POST registers this phone's push token, DELETE removes it (sign out or reminders turned off).
export const POST = api(async (ctx, request) => registerDevice(ctx, await json(request)));
export const DELETE = api(async (ctx, request) => unregisterDevice(ctx, await json(request)));
