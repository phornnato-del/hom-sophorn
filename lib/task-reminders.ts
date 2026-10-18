import { isPrismaError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { daysBetweenDates } from "@/lib/task-validation";

type LocalDateTime = {
  date: string;
  time: string;
};

type TelegramConfiguration = {
  token: string;
  chatId: string;
  threadId: string | undefined;
};

function getLocalDateTime(date = new Date()): LocalDateTime {
  const timeZone = process.env.TASK_REMINDER_TIMEZONE || "Asia/Phnom_Penh";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return replacements[character];
  });
}

function getTelegramConfiguration() {
  const token = process.env.TOKEN;
  const chatId = process.env.CHAT_ID;
  const threadId = process.env.THREAD_ID;
  if (!token || !chatId) {
    throw new Error("Telegram bot configuration is incomplete: TOKEN and CHAT_ID are required");
  }
  if (threadId && !/^\d+$/.test(threadId)) {
    throw new Error("THREAD_ID must be a numeric Telegram message thread ID");
  }
  return { token, chatId, threadId };
}

async function sendTelegramReminder(
  task: {
    title: string;
    category: string;
    priority: string;
    status: string;
    startDate: string;
    deadline: string;
    reminderTime: string;
    notes: string | null;
  },
  reminderDaysBefore: number,
  { token, chatId, threadId }: TelegramConfiguration,
) {
  const dueLabel = reminderDaysBefore === 0
    ? "Due today"
    : `${reminderDaysBefore} day${reminderDaysBefore === 1 ? "" : "s"} left`;
  const deadlineDate = new Date(`${task.deadline}T00:00:00.000Z`);
  const formattedDeadline = deadlineDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const [hours, minutes] = task.reminderTime.split(":").map(Number);
  const formattedReminderTime = new Date(Date.UTC(2000, 0, 1, hours, minutes))
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });
  const nudge = reminderDaysBefore === 0
    ? "Deadline day—pick one small next step and get it done. You’ve got this!"
    : "A little head start goes a long way. You’ve got this!";
  const text = [
    `✨ <b>Task check-in: ${escapeHtml(task.title)}</b>`,
    "",
    `📅 <b>${escapeHtml(dueLabel)}</b> · ${escapeHtml(formattedDeadline)}`,
    `🗓 Started: ${escapeHtml(task.startDate)} · Preferred reminder: ${escapeHtml(formattedReminderTime)}`,
    `🏷 Category: ${escapeHtml(task.category)}`,
    `⚡ Priority: ${escapeHtml(task.priority)} · 📌 Status: ${escapeHtml(task.status)}`,
    ...(task.notes ? [`📝 Notes: ${escapeHtml(task.notes)}`] : []),
    "",
    `💡 <i>${escapeHtml(nudge)}</i>`,
  ].join("\n");

  let response: Response;
  try {
    response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        ...(threadId ? { message_thread_id: Number(threadId) } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("Telegram sendMessage request could not be completed");
  }

  const result: unknown = await response.json();
  if (!response.ok || !result || typeof result !== "object" || !("ok" in result) || result.ok !== true) {
    throw new Error("Telegram sendMessage request failed");
  }
}

export async function dispatchTaskReminders(
  now = new Date(),
  options: { honorReminderTime?: boolean } = {},
) {
  const honorReminderTime = options.honorReminderTime ?? true;
  const telegramConfiguration = getTelegramConfiguration();
  const { date, time } = getLocalDateTime(now);
  const tasks = await prisma.task.findMany({
    where: { status: { not: "Done" } },
  });
  let sent = 0;
  let failed = 0;

  for (const task of tasks) {
    if (honorReminderTime && task.reminderTime > time) continue;

    const reminderDaysBefore = task.remindDays.find(
      (days) => daysBetweenDates(date, task.deadline) === days,
    );
    if (reminderDaysBefore === undefined) continue;

    let delivery;
    try {
      delivery = await prisma.taskReminderDelivery.create({
        data: {
          taskId: task.id,
          scheduledDate: date,
          reminderDaysBefore,
        },
      });
    } catch (error: unknown) {
      if (isPrismaError(error) && error.code === "P2002") continue;
      throw error;
    }

    try {
      await sendTelegramReminder(task, reminderDaysBefore, telegramConfiguration);
    } catch (error: unknown) {
      console.error(`Task reminder delivery failed for task ${task.id}:`, error);
      try {
        await prisma.taskReminderDelivery.delete({ where: { id: delivery.id } });
      } catch (cleanupError: unknown) {
        console.error(`Could not release failed reminder delivery for task ${task.id}:`, cleanupError);
      }
      failed += 1;
      continue;
    }

    await prisma.taskReminderDelivery.update({
      where: { id: delivery.id },
      data: { sentAt: now },
    });
    sent += 1;
  }

  return { checked: tasks.length, sent, failed, date, time };
}

export function getTaskLocalDate() {
  return getLocalDateTime().date;
}
