"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  createApi,
  deleteApi,
  updateApi,
} from "@/lib/api-service";
import {
  listTasks,
  type AdminTask,
} from "@/feature/admin/services/adminApi";

type TaskFormValues = {
  title: string;
  category: string;
  priority: AdminTask["priority"];
  status: AdminTask["status"];
  startDate: string;
  deadline: string;
  remindDays: string;
  reminderTime: string;
  notes: string;
};

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyForm(): TaskFormValues {
  const today = getToday();
  return {
    title: "",
    category: "",
    priority: "Medium",
    status: "To Do",
    startDate: today,
    deadline: today,
    remindDays: "1, 0",
    reminderTime: "08:00",
    notes: "",
  };
}

function taskToForm(task: AdminTask): TaskFormValues {
  return {
    title: task.title,
    category: task.category,
    priority: task.priority,
    status: task.status,
    startDate: task.startDate,
    deadline: task.deadline,
    remindDays: task.remindDays.join(", "),
    reminderTime: task.reminderTime,
    notes: task.notes ?? "",
  };
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#120d1d] px-4 py-3 text-sm text-white outline-none transition focus:border-lilac/50";

export default function TaskManager() {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [filterInput, setFilterInput] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [formError, setFormError] = useState("");
  const [activeForm, setActiveForm] = useState(false);
  const [editingTask, setEditingTask] = useState<AdminTask | null>(null);
  const [values, setValues] = useState<TaskFormValues>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    listTasks({
      page,
      pageSize: 10,
      filter,
      signal: controller.signal,
    })
      .then((result) => {
        setTasks(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : "Unable to load tasks.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filter, page, refreshKey]);

  function openCreateForm() {
    setEditingTask(null);
    setValues(emptyForm());
    setFormError("");
    setActionError("");
    setActiveForm(true);
  }

  function openEditForm(task: AdminTask) {
    setEditingTask(task);
    setValues(taskToForm(task));
    setFormError("");
    setActionError("");
    setActiveForm(true);
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    const reminderValues = values.remindDays
      .split(",")
      .map((day) => day.trim())
      .filter(Boolean);
    if (reminderValues.some((day) => !/^\d+$/.test(day))) {
      setFormError("Enter reminder days as whole numbers separated by commas.");
      setSaving(false);
      return;
    }

    const body = {
      ...values,
      remindDays: reminderValues.map(Number),
      notes: values.notes.trim() || null,
    };

    try {
      if (editingTask) {
        await updateApi<AdminTask, typeof body>(
          "/api/admin/tasks",
          editingTask.id,
          body,
          "PATCH",
        );
      } else {
        await createApi<AdminTask, typeof body>("/api/admin/tasks", body);
      }
      setActiveForm(false);
      setEditingTask(null);
      setActionError("");
      setPage(1);
      setLoading(true);
      setRefreshKey((current) => current + 1);
    } catch (error: unknown) {
      setFormError(
        error instanceof Error
          ? error.message
          : editingTask
            ? "Unable to update task."
            : "Unable to create task.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeTask(task: AdminTask) {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;

    setDeletingId(task.id);
    setActionError("");
    try {
      await deleteApi("/api/admin/tasks", task.id);
      setLoading(true);
      if (tasks.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setRefreshKey((current) => current + 1);
      }
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "Unable to delete task.");
    } finally {
      setDeletingId("");
    }
  }

  function submitFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setLoadError("");
    setPage(1);
    setFilter(filterInput.trim());
  }

  function setField<Key extends keyof TaskFormValues>(
    key: Key,
    value: TaskFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neon">
            Workspace planning
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Tasks</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
            Organize deadlines and send Telegram reminders on the days you choose.
          </p>
        </div>
        <button
          type="button"
          onClick={activeForm ? () => setActiveForm(false) : openCreateForm}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-violet-400 px-4 py-2.5 text-sm font-semibold text-[#160e23] transition hover:bg-violet-300"
        >
          {activeForm ? <X size={16} /> : <Plus size={16} />}
          {activeForm ? "Cancel" : "Add task"}
        </button>
      </div>

      {activeForm && (
        <form onSubmit={submitTask} className="glass overflow-hidden rounded-2xl">
          <div className="border-b border-white/8 px-5 py-4 sm:px-7">
            <h2 className="text-sm font-semibold">{editingTask ? "Edit task" : "Create a task"}</h2>
            <p className="mt-1 text-xs text-white/40">
              Changes are saved to your task list and used for scheduled reminders.
            </p>
          </div>
          <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">Task name</span>
              <input
                required
                maxLength={200}
                value={values.title}
                onChange={(event) => setField("title", event.target.value)}
                className={inputClass}
                placeholder="Finish report"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">Category</span>
              <input
                required
                maxLength={80}
                value={values.category}
                onChange={(event) => setField("category", event.target.value)}
                className={inputClass}
                placeholder="Work, Personal, Home..."
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">Priority</span>
              <select
                value={values.priority}
                onChange={(event) => setField("priority", event.target.value as AdminTask["priority"])}
                className={inputClass}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">Status</span>
              <select
                value={values.status}
                onChange={(event) => setField("status", event.target.value as AdminTask["status"])}
                className={inputClass}
              >
                <option>To Do</option>
                <option>In Progress</option>
                <option>Done</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">Start date</span>
              <input
                required
                type="date"
                value={values.startDate}
                onChange={(event) => setField("startDate", event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">Deadline</span>
              <input
                required
                type="date"
                value={values.deadline}
                onChange={(event) => setField("deadline", event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">Remind me (days before)</span>
              <input
                value={values.remindDays}
                onChange={(event) => setField("remindDays", event.target.value)}
                className={inputClass}
                placeholder="7, 3, 1, 0"
                aria-describedby="task-reminder-help"
              />
              <span id="task-reminder-help" className="mt-2 block text-xs text-white/40">
                Separate days with commas. Use 0 for a reminder on the deadline date.
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">Reminder time</span>
              <input
                required
                type="time"
                step={60}
                value={values.reminderTime}
                onChange={(event) => setField("reminderTime", event.target.value)}
                className={inputClass}
              />
              <span className="mt-2 block text-xs text-white/40">
                Choose any time. Reminders use the configured timezone.
              </span>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-medium text-white/80">Notes</span>
              <textarea
                rows={3}
                value={values.notes}
                onChange={(event) => setField("notes", event.target.value)}
                className={`${inputClass} resize-y`}
                placeholder="Optional details for this task"
              />
            </label>
          </div>
          {formError && (
            <p role="alert" className="mx-5 mb-4 rounded-lg border border-rose-300/20 bg-rose-300/5 px-4 py-3 text-sm text-rose-100 sm:mx-7">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-white/8 px-5 py-4 sm:px-7">
            <button
              type="button"
              onClick={() => setActiveForm(false)}
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/65 transition hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-violet-400 px-4 py-2.5 text-sm font-semibold text-[#160e23] transition hover:bg-violet-300 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? "Saving..." : editingTask ? "Save changes" : "Create task"}
            </button>
          </div>
        </form>
      )}

      <section className="glass overflow-hidden rounded-2xl">
        <div className="flex flex-col justify-between gap-4 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="text-sm font-semibold">Your task list</h2>
            <p className="mt-1 text-xs text-white/40">{total} task{total === 1 ? "" : "s"} total</p>
          </div>
          <form onSubmit={submitFilter} className="flex w-full gap-2 sm:w-auto">
            <label className="relative min-w-0 flex-1 sm:w-64">
              <span className="sr-only">Search tasks</span>
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
              <input
                value={filterInput}
                onChange={(event) => setFilterInput(event.target.value)}
                placeholder="Search tasks..."
                className="w-full rounded-lg border border-white/10 bg-black/15 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-lilac/40"
              />
            </label>
            <button type="submit" className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/70 transition hover:border-lilac/30 hover:text-white">
              Search
            </button>
          </form>
        </div>

        {actionError && (
          <p role="alert" className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-rose-300/20 bg-rose-300/5 px-4 py-3 text-sm text-rose-100 sm:mx-6">
            <AlertCircle size={16} /> {actionError}
          </p>
        )}
        {loadError ? (
          <div role="alert" className="flex flex-col items-start gap-3 px-5 py-10 text-sm text-rose-100 sm:px-6">
            <span className="flex items-center gap-2"><AlertCircle size={16} /> {loadError}</span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setLoadError("");
                setRefreshKey((current) => current + 1);
              }}
              className="text-white underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <div role="status" className="space-y-3 p-5 sm:p-6">
            <span className="sr-only">Loading tasks</span>
            {[0, 1, 2].map((row) => <div key={row} className="h-14 animate-pulse rounded-xl bg-white/5" />)}
          </div>
        ) : tasks.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left">
                <thead className="bg-white/[0.025] text-xs text-white/40">
                  <tr>
                    <th className="px-5 py-3 font-medium sm:px-6">Task</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Deadline</th>
                    <th className="px-4 py-3 font-medium">Reminders</th>
                    <th className="px-5 py-3 text-right font-medium sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {tasks.map((task) => (
                    <tr key={task.id} className="transition hover:bg-white/[0.025]">
                      <td className="px-5 py-4 sm:px-6">
                        <p className="max-w-64 truncate text-sm font-medium text-white/90">{task.title}</p>
                        <p className="mt-1 text-xs text-white/40">{task.category}</p>
                      </td>
                      <td className="px-4 py-4">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-white/70">{task.deadline}</p>
                        <p className={`mt-1 text-xs ${task.status !== "Done" && task.daysLeft < 0 ? "text-rose-200" : task.daysLeft === 0 ? "text-amber-200" : "text-white/35"}`}>
                          {task.status === "Done"
                            ? "Completed"
                            : task.daysLeft < 0
                              ? `${Math.abs(task.daysLeft)} day${Math.abs(task.daysLeft) === 1 ? "" : "s"} overdue`
                              : task.daysLeft === 0
                                ? "Due today"
                                : `${task.daysLeft} day${task.daysLeft === 1 ? "" : "s"} left`}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-white/55">
                          <CalendarClock size={14} />
                          {task.remindDays.length ? task.remindDays.join(", ") : "Off"}{task.remindDays.length ? " days" : ""}
                        </span>
                        {task.remindDays.length > 0 && (
                          <p className="mt-1 pl-5 text-[11px] text-white/35">
                            {task.reminderTime}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditForm(task)}
                            aria-label={`Edit ${task.title}`}
                            className="rounded-lg p-2 text-white/45 transition hover:bg-violet-300/10 hover:text-lilac"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeTask(task)}
                            disabled={deletingId === task.id}
                            aria-label={`Delete ${task.title}`}
                            className="rounded-lg p-2 text-white/45 transition hover:bg-rose-300/10 hover:text-rose-200 disabled:opacity-40"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-white/8 px-5 py-3 sm:px-6">
              <p className="text-xs text-white/40">Page {page} of {Math.max(totalPages, 1)}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setPage((current) => current - 1);
                  }}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setPage((current) => current + 1);
                  }}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                  className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-300/10 text-lilac">
              <ClipboardList size={22} />
            </span>
            <h3 className="mt-4 text-sm font-semibold">{filter ? "No matching tasks" : "No tasks yet"}</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-white/45">
              {filter ? "Try a different search term." : "Add your first task to start tracking deadlines and reminders."}
            </p>
            {!filter && (
              <button type="button" onClick={openCreateForm} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-violet-400 px-4 py-2.5 text-sm font-semibold text-[#160e23] transition hover:bg-violet-300">
                <Plus size={16} /> Add task
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: AdminTask["priority"] }) {
  const styles = {
    High: "border-rose-300/15 bg-rose-300/5 text-rose-200",
    Medium: "border-amber-200/15 bg-amber-200/5 text-amber-100",
    Low: "border-cyan-300/15 bg-cyan-300/5 text-cyan-100",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${styles[priority]}`}>{priority}</span>;
}

function StatusBadge({ status }: { status: AdminTask["status"] }) {
  const styles = {
    "To Do": "border-white/10 bg-white/[0.03] text-white/65",
    "In Progress": "border-violet-300/15 bg-violet-300/5 text-lilac",
    Done: "border-emerald-300/15 bg-emerald-300/5 text-emerald-200",
  };
  return <span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium ${styles[status]}`}>{status}</span>;
}
