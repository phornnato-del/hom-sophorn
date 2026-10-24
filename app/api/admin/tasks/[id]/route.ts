import { withApiEncryption } from "@/lib/encrypted-api-handler";
import { getErrorMessage, isPrismaError } from "@/lib/errors";
import { isObjectId } from "@/lib/validate";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { getTaskLocalDate } from "@/lib/task-reminders";
import { daysBetweenDates, parseTaskUpdateInput } from "@/lib/task-validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getHandler(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) return fail("Invalid id format", 400);

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return fail("Task not found", 404);

    return ok(
      { ...task, daysLeft: daysBetweenDates(getTaskLocalDate(), task.deadline) },
      "Task retrieved",
    );
  } catch (error: unknown) {
    console.error(error);
    return fail(getErrorMessage(error));
  }
}

async function patchHandler(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) return fail("Invalid id format", 400);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Request body must contain valid JSON", 400);
    }

    const parsed = parseTaskUpdateInput(body);
    if (!parsed.ok) return fail(parsed.error, 400);

    const current = await prisma.task.findUnique({ where: { id } });
    if (!current) return fail("Task not found", 404);
    const startDate = parsed.data.startDate ?? current.startDate;
    const deadline = parsed.data.deadline ?? current.deadline;
    if (deadline < startDate) {
      return fail("Deadline cannot be before the start date", 400);
    }

    const task = await prisma.task.update({
      where: { id },
      data: parsed.data,
    });
    return ok(
      { ...task, daysLeft: daysBetweenDates(getTaskLocalDate(), task.deadline) },
      "Task updated",
    );
  } catch (error: unknown) {
    console.error(error);
    if (isPrismaError(error) && error.code === "P2025") {
      return fail("Task not found", 404);
    }
    return fail(getErrorMessage(error));
  }
}

async function deleteHandler(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) return fail("Invalid id format", 400);

    await prisma.taskReminderDelivery.deleteMany({ where: { taskId: id } });
    await prisma.task.delete({ where: { id } });
    return ok(null, "Task deleted");
  } catch (error: unknown) {
    console.error(error);
    if (isPrismaError(error) && error.code === "P2025") {
      return fail("Task not found", 404);
    }
    return fail(getErrorMessage(error));
  }
}

export const GET = withApiEncryption(getHandler);
export const PATCH = withApiEncryption(patchHandler);
export const DELETE = withApiEncryption(deleteHandler);
