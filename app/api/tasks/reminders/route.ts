import { timingSafeEqual } from "node:crypto";
import { getErrorMessage } from "@/lib/errors";
import { dispatchTaskReminders } from "@/lib/task-reminders";
import { fail, ok } from "@/lib/response";

function isAuthorized(request: Request, secret: string) {
  const authorization = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(authorization);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return fail("Reminder dispatch is not configured", 503);
  if (!isAuthorized(request, secret)) return fail("Unauthorized", 401);

  try {
    const result = await dispatchTaskReminders(new Date(), { honorReminderTime: false });
    if (result.failed > 0) {
      return ok(result, "Reminder dispatch completed with delivery failures", 207);
    }
    return ok(result, "Reminder dispatch completed");
  } catch (error: unknown) {
    console.error(error);
    return fail(getErrorMessage(error));
  }
}
