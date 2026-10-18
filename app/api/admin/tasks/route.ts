import { getErrorMessage } from "@/lib/errors";
import { paginatedResult, parsePaginationParams } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { getTaskLocalDate } from "@/lib/task-reminders";
import { daysBetweenDates, parseTaskCreateInput } from "@/lib/task-validation";

export async function GET(request: Request) {
  try {
    const parsed = parsePaginationParams(request.url);
    if ("error" in parsed) return fail(parsed.error, 400);
    const { page, pageSize, filter, skip } = parsed.params;
    const where = filter
      ? {
          OR: [
            { title: { contains: filter, mode: "insensitive" as const } },
            { category: { contains: filter, mode: "insensitive" as const } },
            { priority: { contains: filter, mode: "insensitive" as const } },
            { status: { contains: filter, mode: "insensitive" as const } },
            { notes: { contains: filter, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
      }),
      prisma.task.count({ where }),
    ]);
    const today = getTaskLocalDate();
    const tasksWithDaysLeft = tasks.map((task) => ({
      ...task,
      daysLeft: daysBetweenDates(today, task.deadline),
    }));

    return ok(paginatedResult(tasksWithDaysLeft, total, page, pageSize), "Tasks retrieved");
  } catch (error: unknown) {
    console.error(error);
    return fail(getErrorMessage(error));
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Request body must contain valid JSON", 400);
    }

    const parsed = parseTaskCreateInput(body);
    if (!parsed.ok) return fail(parsed.error, 400);

    const task = await prisma.task.create({ data: parsed.data });
    return ok(
      { ...task, daysLeft: daysBetweenDates(getTaskLocalDate(), task.deadline) },
      "Task created",
      201,
    );
  } catch (error: unknown) {
    console.error(error);
    return fail(getErrorMessage(error));
  }
}
