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

type ReminderTask = {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  startDate: string;
  deadline: string;
  remindDays: number[];
  reminderTime: string;
  notes: string | null;
};

type DueReminder = {
  task: ReminderTask;
  daysUntilDeadline: number;
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

export function dueReminders(tasks: ReminderTask[], now = new Date()): DueReminder[] {
  const { date, time } = getLocalDateTime(now);

  return tasks.flatMap((task) => {
    if (task.status === "Done" || task.reminderTime > time) return [];

    const daysUntilDeadline = daysBetweenDates(date, task.deadline);
    if (daysUntilDeadline > 0 && !task.remindDays.includes(daysUntilDeadline)) return [];
    if (daysUntilDeadline === 0 && !task.remindDays.includes(0)) return [];

    return [{ task, daysUntilDeadline }];
  });
}

function formatReminderEntry({ task, daysUntilDeadline }: DueReminder) {
  const label = daysUntilDeadline < 0
    ? `🔴 OVERDUE ${Math.abs(daysUntilDeadline)}d`
    : daysUntilDeadline === 0
      ? "🚨 TODAY"
      : `⏰ ${daysUntilDeadline} days left`;
  return `${label}: ${escapeHtml(task.title)} [${escapeHtml(task.priority)}]`;
}

async function sendTelegramMessage(text: string, configuration: TelegramConfiguration) {
  const { token, chatId, threadId } = configuration;
  if (text.length > 4096) {
    throw new Error("Telegram reminder digest exceeds the 4096-character message limit");
  }

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

  await sendTelegramMessage(text, { token, chatId, threadId });
}

export async function dispatchTaskReminderDigest(now = new Date()) {
  const telegramConfiguration = getTelegramConfiguration();
  const { date, time } = getLocalDateTime(now);
  const tasks = await prisma.task.findMany({
    where: { status: { not: "Done" } },
  });
  const due = dueReminders(tasks, now);
  const deliveries: { id: string; task: ReminderTask; daysUntilDeadline: number }[] = [];

  try {
    for (const reminder of due) {
      try {
        const delivery = await prisma.taskReminderDelivery.create({
          data: {
            taskId: reminder.task.id,
            scheduledDate: date,
            reminderDaysBefore: reminder.daysUntilDeadline,
          },
          select: { id: true },
        });
        deliveries.push({ ...reminder, id: delivery.id });
      } catch (error: unknown) {
        if (isPrismaError(error) && error.code === "P2002") continue;
        throw error;
      }
    }
  } catch (error: unknown) {
    await releaseReminderDeliveries(deliveries.map(({ id }) => id));
    throw error;
  }

  if (deliveries.length === 0) {
    return { checked: tasks.length, due: 0, sent: 0, date, time };
  }

  const text = [
    "📋 <b>Task reminders</b>",
    ...deliveries.map(formatReminderEntry),
  ].join("\n");

  try {
    await sendTelegramMessage(text, telegramConfiguration);
  } catch (error: unknown) {
    await releaseReminderDeliveries(deliveries.map(({ id }) => id));
    throw error;
  }

  let updated;
  try {
    updated = await prisma.taskReminderDelivery.updateMany({
      where: { id: { in: deliveries.map(({ id }) => id) } },
      data: { sentAt: now },
    });
  } catch (error: unknown) {
    await releasePendingReminderDeliveries(deliveries.map(({ id }) => id));
    throw error;
  }
  if (updated.count !== deliveries.length) {
    await releasePendingReminderDeliveries(deliveries.map(({ id }) => id));
    throw new Error("Telegram digest was sent, but not all reminder deliveries were marked as sent");
  }

  return { checked: tasks.length, due: deliveries.length, sent: deliveries.length, date, time };
}

async function releaseReminderDeliveries(ids: string[]) {
  if (ids.length === 0) return;

  try {
    await prisma.taskReminderDelivery.deleteMany({ where: { id: { in: ids } } });
  } catch (error: unknown) {
    console.error("Could not release unsent task reminder deliveries:", error);
  }
}

async function releasePendingReminderDeliveries(ids: string[]) {
  if (ids.length === 0) return;

  try {
    await prisma.taskReminderDelivery.deleteMany({
      where: { id: { in: ids }, sentAt: null },
    });
  } catch (error: unknown) {
    console.error("Could not release unmarked task reminder deliveries:", error);
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

    const existingDelivery = await prisma.taskReminderDelivery.findFirst({
      where: { taskId: task.id, scheduledDate: date },
      select: { id: true },
    });
    if (existingDelivery) continue;

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
