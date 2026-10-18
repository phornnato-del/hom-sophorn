import { dispatchTaskReminderDigest } from "@/lib/task-reminders";

export const maxDuration = 30;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[task reminders] CRON_SECRET is not configured");
    return Response.json({ error: "Cron authentication is not configured" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await dispatchTaskReminderDigest();
    return Response.json({
      checked: result.checked,
      due: result.due,
      sent: result.sent,
    });
  } catch (error: unknown) {
    console.error("[task reminders] Cron dispatch failed:", error);
    return Response.json({ error: "Task reminder dispatch failed" }, { status: 500 });
  }
}
