"use client";

import EncryptedImage from "@/shared/ui/EncryptedImage";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  createAdminItem,
  deleteAdminItem,
  listAdminItems,
  updateAdminItem,
  type AdminCollectionItem,
  type AdminCollectionKey,
} from "@/feature/admin/services/adminApi";
import { uploadImage } from "@/lib/uploadImage";
import { imageSrc } from "@/lib/imageSrc";
import { encryptedFetch } from "@/lib/encrypted-fetch";

type CollectionField = {
  key: string;
  label: string;
  type?: string;
  multiline?: boolean;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  folder?: string;
};

const collections: Record<AdminCollectionKey, {
  title: string;
  description: string;
  singular: string;
  fields: CollectionField[];
  columns: { key: string; label: string }[];
}> = {
  admin: {
    title: "Admin users",
    description: "View and add accounts that can access the portfolio workspace.",
    singular: "admin user",
    fields: [
      { key: "image", label: "Profile image", folder: "avatars", required: false },
      { key: "name", label: "Name" },
      { key: "email", label: "Email address", type: "email" },
      { key: "password", label: "Password", type: "password" },
    ],
    columns: [
      { key: "image", label: "Image" },
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "mfaEnabled", label: "Authenticator" },
    ],
  },
  hero: {
    title: "Hero banners",
    description: "Manage the banner content shown in the portfolio hero section.",
    singular: "banner",
    fields: [
      { key: "name", label: "Name" },
      { key: "tag", label: "Tag", required: false },
      { key: "title", label: "Title" },
      { key: "slogan", label: "Slogan" },
      { key: "desc", label: "Description", multiline: true },
      { key: "link", label: "Link", type: "url" },
      { key: "image", label: "Banner image", folder: "banners" },
    ],
    columns: [
      { key: "image", label: "Image" },
      { key: "title", label: "Title" },
      { key: "name", label: "Name" },
      { key: "tag", label: "Tag" },
    ],
  },
  about: {
    title: "About entries",
    description: "Manage the about content and language entries for your portfolio.",
    singular: "about entry",
    fields: [
      { key: "tag", label: "Tag" },
      { key: "title", label: "Title" },
      { key: "desc", label: "Description", multiline: true },
      {
        key: "Lanuage",
        label: "Languages and technologies",
        multiline: true,
        placeholder: "Java, JavaScript, TypeScript, Python, C++, C#",
        hint: "Enter each language or technology separated by a comma.",
      },
    ],
    columns: [
      { key: "title", label: "Title" },
      { key: "tag", label: "Tag" },
      { key: "Lanuage", label: "Language" },
    ],
  },
  projects: {
    title: "Projects",
    description: "Browse and add the projects displayed in your portfolio.",
    singular: "project",
    fields: [
      { key: "title", label: "Project name" },
      { key: "image", label: "Project image", folder: "projects" },
      { key: "desc", label: "Description", multiline: true },
      {
        key: "technology",
        label: "Technologies",
        placeholder: "Next.js, TypeScript, Tailwind CSS",
      },
      { key: "git_link", label: "Repository URL", type: "url", required: false },
      { key: "live_link", label: "Live URL", type: "url", required: false },
    ],
    columns: [
      { key: "image", label: "Image" },
      { key: "title", label: "Project" },
      { key: "technology", label: "Technologies" },
    ],
  },
  contact: {
    title: "Contact links",
    description: "Manage the contact methods and social links shown on your portfolio.",
    singular: "contact",
    fields: [
      { key: "type", label: "Contact type" },
      { key: "link", label: "Link", type: "url" },
    ],
    columns: [
      { key: "type", label: "Type" },
      { key: "link", label: "Link" },
    ],
  },
};

export default function CollectionManager({
  collection,
}: {
  collection: AdminCollectionKey;
}) {
  const details = collections[collection];
  const [items, setItems] = useState<AdminCollectionItem[]>([]);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [filterInput, setFilterInput] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [createError, setCreateError] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeForm, setActiveForm] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<AdminCollectionItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [mfaSetup, setMfaSetup] = useState<{ id: string; name: string; uri: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaSaving, setMfaSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    listAdminItems(collection, {
      page,
      pageSize: 5,
      filter,
      signal: controller.signal,
    })
      .then((result) => {
        setItems(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : "Unable to load records.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [collection, filter, page, refreshKey]);

  function submitFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFilter = filterInput.trim();
    if (nextFilter === filter && page === 1) return;
    setLoading(true);
    setLoadError("");
    setPage(1);
    setFilter(nextFilter);
  }

  function changePage(nextPage: number) {
    setLoading(true);
    setLoadError("");
    setPage(nextPage);
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setCreateError("");

    const body = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value.trim() !== ""),
    );

    try {
      if (activeForm === "edit" && editingItem) {
        await updateAdminItem(collection, editingItem, body);
      } else {
        const created = await createAdminItem(collection, body);
        if (collection === "admin" && typeof created.mfaSetupUri === "string") {
          setMfaSetup({
            id: created.id,
            name: typeof created.name === "string" ? created.name : "New admin",
            uri: created.mfaSetupUri,
          });
          setMfaCode("");
          setMfaError("");
        }
      }
      setValues({});
      setActiveForm(null);
      setEditingItem(null);
      setLoading(true);
      setLoadError("");
      setActionError("");
      setPage(1);
      setRefreshKey((current) => current + 1);
    } catch (error: unknown) {
      setCreateError(
        error instanceof Error
          ? error.message
          : activeForm === "edit"
            ? "Unable to update record."
            : "Unable to create record.",
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: AdminCollectionItem) {
    setEditingItem(item);
    const nextValues: Record<string, string> = {};
    for (const field of details.fields) {
      const value = item[field.key];
      nextValues[field.key] =
        field.key !== "password" && typeof value === "string" ? value : "";
    }
    setValues(nextValues);
    setImagePreview(typeof item.image === "string" ? imageSrc(item.image) : "");
    setCreateError("");
    setActiveForm("edit");
  }

  async function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
    folder: string,
  ) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setCreateError("");
    try {
      const uploaded = await uploadImage(file, folder);
      setValues((current) => ({ ...current, image: uploaded.pathname }));
      setImagePreview(uploaded.url);
    } catch (error: unknown) {
      setCreateError(error instanceof Error ? error.message : "Unable to upload image.");
    } finally {
      setUploadingImage(false);
      input.value = "";
    }
  }

  async function removeItem(item: AdminCollectionItem) {
    if (!window.confirm(`Delete this ${details.singular}? This cannot be undone.`)) return;

    setDeletingId(item.id);
    setActionError("");
    try {
      await deleteAdminItem(collection, item);
      setLoading(true);
      if (items.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setRefreshKey((current) => current + 1);
      }
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "Unable to delete record.");
    } finally {
      setDeletingId("");
    }
  }

  async function beginMfaSetup(item: AdminCollectionItem) {
    if (
      item.mfaEnabled === true &&
      !window.confirm(
        `Reset the authenticator for ${typeof item.name === "string" ? item.name : "this admin"}? Their current authenticator will stop working.`,
      )
    ) {
      return;
    }

    setMfaError("");
    setActionError("");
    try {
      const response = await encryptedFetch(`/api/admin/${encodeURIComponent(item.id)}/mfa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = (await response.json()) as {
        message?: string;
        data?: { otpauthUrl?: string };
      };
      if (!response.ok || !result.data?.otpauthUrl) {
        throw new Error(result.message || "Unable to start authenticator setup.");
      }

      setMfaSetup({
        id: item.id,
        name: typeof item.name === "string" ? item.name : "Admin",
        uri: result.data.otpauthUrl,
      });
      setMfaCode("");
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "Unable to start authenticator setup.");
    }
  }

  async function verifyMfaSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mfaSetup) return;
    setMfaSaving(true);
    setMfaError("");
    try {
      const response = await encryptedFetch(`/api/admin/${encodeURIComponent(mfaSetup.id)}/mfa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code: mfaCode }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Unable to verify authenticator code.");

      setMfaSetup(null);
      setMfaCode("");
      setLoading(true);
      setRefreshKey((current) => current + 1);
    } catch (error: unknown) {
      setMfaError(error instanceof Error ? error.message : "Unable to verify authenticator code.");
    } finally {
      setMfaSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neon">Workspace content</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{details.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{details.description}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setActiveForm((current) => current ? null : "create");
            setEditingItem(null);
            setValues({});
            setImagePreview("");
            setCreateError("");
            setActionError("");
          }}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-violet-400 px-4 py-2.5 text-sm font-semibold text-[#160e23] transition hover:bg-violet-300"
        >
          {activeForm ? <X size={16} /> : <Plus size={16} />}
          {activeForm ? "Cancel" : `Add ${details.singular}`}
        </button>
      </div>

      {activeForm && (
        <form onSubmit={submitCreate} className="glass rounded-2xl">
          <div className="border-b border-white/8 px-5 py-4 sm:px-7">
            <h2 className="text-sm font-semibold">
              {activeForm === "edit" ? `Update ${details.singular}` : `Create ${details.singular}`}
            </h2>
            <p className="mt-1 text-xs text-white/40">
              {activeForm === "edit" ? "Save your changes to the database." : "New records are saved to the database."}
            </p>
          </div>
          <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
            {details.fields.map((field) => (
              <label key={field.key} className={`block ${field.multiline || field.folder ? "sm:col-span-2" : ""}`}>
                <span className="mb-2 block text-sm font-medium text-white/80">{field.label}</span>
                {field.folder ? (
                  <>
                    <span className="flex flex-col gap-4 rounded-xl border border-dashed border-white/15 bg-black/10 p-4 sm:flex-row sm:items-center">
                      {imagePreview ? (
                        <span className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                          <EncryptedImage
                            src={imagePreview}
                            alt={`${field.label} preview`}
                            fill
                            unoptimized
                            sizes="128px"
                            className="object-cover"
                          />
                        </span>
                      ) : (
                        <span className="flex h-24 w-32 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/30">
                          <ImagePlus size={24} />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          required={
                            activeForm === "create" &&
                            field.required !== false &&
                            !values[field.key]
                          }
                          disabled={uploadingImage}
                          onChange={(event) => void handleImageChange(event, field.folder!)}
                          className="block w-full text-sm text-white/65 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-300/15 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-lilac hover:file:bg-violet-300/25"
                        />
                        <span className="mt-2 block text-xs text-white/40">
                          {uploadingImage
                            ? "Uploading image..."
                            : values.image
                              ? `Uploaded: ${values.image}`
                              : activeForm === "edit" && imagePreview
                                ? "Choose a new image to replace the current one."
                                : "JPG, PNG, or WEBP. Maximum 4 MB."}
                        </span>
                      </span>
                    </span>
                  </>
                ) : field.multiline ? (
                  <textarea
                    required={activeForm === "create" && field.required !== false}
                    value={values[field.key] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    rows={4}
                    className="w-full resize-y rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-lilac/50"
                  />
                ) : (
                  <input
                    required={activeForm === "create" && field.required !== false}
                    type={field.type ?? "text"}
                    value={values[field.key] ?? ""}
                    placeholder={field.placeholder}
                    autoComplete={field.key === "password" ? "new-password" : undefined}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none focus:border-lilac/50"
                  />
                )}
                {field.hint && <span className="mt-2 block text-xs text-white/40">{field.hint}</span>}
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-3 border-t border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p role="alert" className="min-h-5 text-xs text-rose-200">{createError}</p>
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-400 px-4 py-2.5 text-sm font-semibold text-[#160e23] transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={16} />
              {saving
                ? activeForm === "edit" ? "Saving..." : "Creating..."
                : activeForm === "edit" ? "Save changes" : `Create ${details.singular}`}
            </button>
          </div>
        </form>
      )}

      {actionError && <p role="alert" className="text-sm text-rose-200">{actionError}</p>}

      <section className="glass overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-4 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-sm font-semibold">All {details.title.toLowerCase()}</h2>
            <p className="mt-1 text-xs text-white/40">{total} record{total === 1 ? "" : "s"} · 5 per page</p>
          </div>
          <form onSubmit={submitFilter} className="flex gap-2">
            <label className="relative block">
              <span className="sr-only">Filter records</span>
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
              <input
                value={filterInput}
                onChange={(event) => setFilterInput(event.target.value)}
                placeholder="Filter records"
                maxLength={100}
                className="w-full rounded-lg border border-white/10 bg-black/15 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-lilac/50 sm:w-60"
              />
            </label>
            <button type="submit" className="rounded-lg border border-white/10 px-3 text-sm text-white/70 transition hover:border-lilac/30 hover:text-white">Search</button>
          </form>
        </div>

        {loadError ? (
          <p role="alert" className="px-5 py-8 text-sm text-rose-200 sm:px-6">{loadError}</p>
        ) : loading ? (
          <p role="status" className="px-5 py-8 text-sm text-white/45 sm:px-6">Loading records...</p>
        ) : items.length === 0 ? (
          <p className="px-5 py-8 text-sm text-white/45 sm:px-6">
            {filter ? "No records match this filter." : "No records yet. Add the first one above."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead className="bg-white/3">
                  <tr>
                    {details.columns.map((column) => (
                      <th key={column.key} scope="col" className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40 sm:px-6">
                        {column.label}
                      </th>
                    ))}
                    <th scope="col" className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40 sm:px-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {items.map((item) => (
                    <tr key={item.id} className="transition hover:bg-white/3">
                      {details.columns.map((column) => {
                        const value = item[column.key];
                        return (
                          <td key={column.key} className="max-w-[360px] px-5 py-4 align-top text-sm text-white/75 sm:px-6">
                            {column.key === "image" ? (
                              value ? (
                                <div className="relative h-12 w-16 overflow-hidden rounded-md border border-white/10 bg-white/5">
                                  <EncryptedImage
                                    src={typeof item.image === "string" ? imageSrc(item.image) : ""}
                                    alt={`${details.singular} image`}
                                    fill
                                    unoptimized
                                    sizes="64px"
                                    className="object-cover"
                                  />
                                </div>
                              ) : <span className="text-white/35">—</span>
                            ) : column.key === "mfaEnabled" ? (
                              <span className={`rounded-full px-2.5 py-1 text-xs ${value === true ? "bg-emerald-300/10 text-emerald-200" : "bg-amber-300/10 text-amber-200"}`}>
                                {value === true ? "Enabled" : "Setup required"}
                              </span>
                            ) : typeof value === "string" && value && (column.key === "Lanuage" || column.key === "technology") ? (
                              <div className="flex flex-wrap gap-1.5">
                                {value.split(",").map((entry) => entry.trim()).filter(Boolean).map((entry, index) => (
                                  <span key={`${entry}-${index}`} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-lilac">
                                    {entry}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="line-clamp-2 break-words">{typeof value === "string" ? value || "—" : "—"}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-5 py-4 text-right sm:px-6">
                        <div className="inline-flex items-center gap-1">
                          {collection === "admin" && (
                            <button
                              type="button"
                              aria-label={`${item.mfaEnabled === true ? "Reset" : "Set up"} authenticator for ${typeof item.name === "string" ? item.name : "admin"}`}
                              title={item.mfaEnabled === true ? "Reset authenticator" : "Set up authenticator"}
                              onClick={() => void beginMfaSetup(item)}
                              className="rounded-lg p-2 text-white/50 transition hover:bg-emerald-300/10 hover:text-emerald-200"
                            >
                              {item.mfaEnabled === true ? <KeyRound size={16} /> : <ShieldCheck size={16} />}
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label={`Edit ${details.singular}`}
                            title="Edit"
                            onClick={() => startEdit(item)}
                            className="rounded-lg p-2 text-white/50 transition hover:bg-violet-300/10 hover:text-lilac"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${details.singular}`}
                            title="Delete"
                            disabled={deletingId === item.id}
                            onClick={() => void removeItem(item)}
                            className="rounded-lg p-2 text-white/50 transition hover:bg-rose-300/10 hover:text-rose-200 disabled:cursor-wait disabled:opacity-40"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-white/8 px-5 py-4 sm:px-6">
              <p className="text-xs text-white/45">Page {page} of {Math.max(totalPages, 1)}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => changePage(Math.max(1, page - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:border-lilac/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => changePage(page + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:border-lilac/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {mfaSetup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mfa-dialog-title"
            className="glass my-auto w-full max-w-md rounded-3xl p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon">Two-step verification</p>
                <h2 id="mfa-dialog-title" className="mt-2 text-xl font-semibold">
                  Set up {mfaSetup.name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  Scan with Google Authenticator or another authenticator app, then enter its current 6-digit code.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMfaSetup(null)}
                aria-label="Close authenticator setup"
                className="rounded-lg p-2 text-white/55 transition hover:bg-white/8 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mx-auto my-6 flex w-fit rounded-2xl bg-white p-4">
              <QRCodeSVG value={mfaSetup.uri} size={208} level="M" />
            </div>
            <form onSubmit={verifyMfaSetup} className="space-y-4">
              <label htmlFor="admin-mfa-code" className="block text-sm font-medium text-white/80">
                6-digit authenticator code
              </label>
              <input
                id="admin-mfa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                placeholder="000000"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center text-lg tracking-[0.4em] text-white outline-none placeholder:text-white/30 focus:border-lilac/50"
              />
              {mfaError && <p role="alert" className="text-sm text-rose-200">{mfaError}</p>}
              <button
                type="submit"
                disabled={mfaSaving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 py-3 text-sm font-semibold text-[#160e23] transition hover:bg-violet-300 disabled:cursor-wait disabled:opacity-60"
              >
                <ShieldCheck size={16} />
                {mfaSaving ? "Verifying..." : "Verify and enable"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
