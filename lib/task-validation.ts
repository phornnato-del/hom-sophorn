export const TASK_PRIORITIES = ["High", "Medium", "Low"] as const;
export const TASK_STATUSES = ["To Do", "In Progress", "Done"] as const;

export type TaskInput = {
  title: string;
  category: string;
  priority: (typeof TASK_PRIORITIES)[number];
  status: (typeof TASK_STATUSES)[number];
  startDate: string;
  deadline: string;
  remindDays: number[];
  reminderTime: string;
  notes: string | null;
};

export type TaskUpdateInput = Partial<TaskInput>;

type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isReminderDays(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((day) => Number.isInteger(day) && day >= 0 && day <= 365) &&
    new Set(value).size === value.length
  );
}

function isPriority(value: unknown): value is TaskInput["priority"] {
  return typeof value === "string" && TASK_PRIORITIES.includes(value as TaskInput["priority"]);
}

function isStatus(value: unknown): value is TaskInput["status"] {
  return typeof value === "string" && TASK_STATUSES.includes(value as TaskInput["status"]);
}

function isReminderTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function parseTaskCreateInput(value: unknown): ParseResult<TaskInput> {
  if (!isRecord(value)) return { ok: false, error: "Request body must be an object" };

  const {
    title,
    category,
    priority = "Medium",
    status = "To Do",
    startDate,
    deadline,
    remindDays = [],
    reminderTime = "08:00",
    notes = null,
  } = value;

  if (typeof title !== "string" || !title.trim()) {
    return { ok: false, error: "Task title is required" };
  }
  if (typeof category !== "string" || !category.trim()) {
    return { ok: false, error: "Task category is required" };
  }
  if (!isPriority(priority)) return { ok: false, error: "Priority must be High, Medium, or Low" };
  if (!isStatus(status)) return { ok: false, error: "Status must be To Do, In Progress, or Done" };
  if (!isDateOnly(startDate) || !isDateOnly(deadline)) {
    return { ok: false, error: "Start date and deadline must use YYYY-MM-DD format" };
  }
  if (deadline < startDate) return { ok: false, error: "Deadline cannot be before the start date" };
  if (!isReminderDays(remindDays)) {
    return { ok: false, error: "Reminder days must be unique whole numbers from 0 to 365" };
  }
  if (!isReminderTime(reminderTime)) {
    return { ok: false, error: "Reminder time must be a valid 24-hour time in HH:mm format" };
  }
  if (notes !== null && typeof notes !== "string") {
    return { ok: false, error: "Notes must be a string or null" };
  }
  if (title.trim().length > 200 || category.trim().length > 80) {
    return { ok: false, error: "Title must be at most 200 characters and category at most 80" };
  }

  return {
    ok: true,
    data: {
      title: title.trim(),
      category: category.trim(),
      priority,
      status,
      startDate,
      deadline,
      remindDays,
      reminderTime,
      notes: notes?.trim() || null,
    },
  };
}

export function parseTaskUpdateInput(value: unknown): ParseResult<TaskUpdateInput> {
  if (!isRecord(value)) return { ok: false, error: "Request body must be an object" };

  const data: TaskUpdateInput = {};
  const keys = Object.keys(value);
  if (keys.length === 0) return { ok: false, error: "Nothing to update" };

  for (const key of keys) {
    const field = value[key];
    switch (key) {
      case "title":
        if (typeof field !== "string" || !field.trim() || field.trim().length > 200) {
          return { ok: false, error: "Title must be a non-empty string of at most 200 characters" };
        }
        data.title = field.trim();
        break;
      case "category":
        if (typeof field !== "string" || !field.trim() || field.trim().length > 80) {
          return { ok: false, error: "Category must be a non-empty string of at most 80 characters" };
        }
        data.category = field.trim();
        break;
      case "priority":
        if (!isPriority(field)) return { ok: false, error: "Priority must be High, Medium, or Low" };
        data.priority = field;
        break;
      case "status":
        if (!isStatus(field)) return { ok: false, error: "Status must be To Do, In Progress, or Done" };
        data.status = field;
        break;
      case "startDate":
      case "deadline":
        if (!isDateOnly(field)) {
          return { ok: false, error: `${key} must use YYYY-MM-DD format` };
        }
        data[key] = field;
        break;
      case "remindDays":
        if (!isReminderDays(field)) {
          return { ok: false, error: "Reminder days must be unique whole numbers from 0 to 365" };
        }
        data.remindDays = field;
        break;
      case "reminderTime":
        if (!isReminderTime(field)) {
          return { ok: false, error: "Reminder time must be a valid 24-hour time in HH:mm format" };
        }
        data.reminderTime = field;
        break;
      case "notes":
        if (field !== null && typeof field !== "string") {
          return { ok: false, error: "Notes must be a string or null" };
        }
        data.notes = typeof field === "string" ? field.trim() || null : null;
        break;
      default:
        return { ok: false, error: `Unknown task field: ${key}` };
    }
  }

  return { ok: true, data };
}

export function daysBetweenDates(fromDate: string, toDate: string) {
  const from = Date.parse(`${fromDate}T00:00:00.000Z`);
  const to = Date.parse(`${toDate}T00:00:00.000Z`);
  return Math.round((to - from) / 86_400_000);
}
