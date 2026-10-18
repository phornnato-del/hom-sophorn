const schedulerGlobal = globalThis as typeof globalThis & {
  taskReminderSchedulerStarted?: boolean;
};

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  if (process.env.VERCEL === "1") {
    console.info(
      "[task reminders] In-process scheduler is disabled on Vercel serverless. Run this app on an always-on Node.js server to send reminders at their selected times.",
    );
    return;
  }
  if (schedulerGlobal.taskReminderSchedulerStarted) return;

  schedulerGlobal.taskReminderSchedulerStarted = true;
  const { dispatchTaskReminders } = await import("@/lib/task-reminders");
  let running = false;

  const checkReminders = async () => {
    if (running) return;
    running = true;
    try {
      const result = await dispatchTaskReminders();
      if (result.sent > 0 || result.failed > 0) {
        console.info(
          `[task reminders] ${result.sent} sent, ${result.failed} failed at ${result.date} ${result.time}`,
        );
      }
    } catch (error: unknown) {
      console.error("[task reminders] Local reminder check failed:", error);
    } finally {
      running = false;
    }
  };

  void checkReminders();
  setInterval(() => void checkReminders(), 60_000);
  console.info("[task reminders] Scheduler started (checks every minute)");
}
