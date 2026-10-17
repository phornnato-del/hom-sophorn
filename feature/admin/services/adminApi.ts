import {
  createApi,
  deleteApi,
  listApi,
  updateApi,
  type PaginatedResult,
} from "@/lib/api-service";
import { startTopLoading } from "@/lib/top-loading";

export type AdminCollectionKey =
  | "admin"
  | "hero"
  | "about"
  | "projects"
  | "contact";

export type AdminCollectionItem = {
  id: string;
  [key: string]: string | null | undefined;
};

const endpoints: Record<AdminCollectionKey, string> = {
  admin: "/api/admin",
  hero: "/api/banner",
  about: "/api/about",
  projects: "/api/project",
  contact: "/api/contact",
};

export function listAdminItems(
  collection: AdminCollectionKey,
  options: { page: number; pageSize: number; filter: string; signal?: AbortSignal },
): Promise<PaginatedResult<AdminCollectionItem>> {
  return listApi<AdminCollectionItem>(endpoints[collection], options);
}

export function createAdminItem(
  collection: AdminCollectionKey,
  body: Record<string, string>,
): Promise<AdminCollectionItem> {
  return createApi<AdminCollectionItem, Record<string, string>>(
    endpoints[collection],
    body,
  );
}

export function updateAdminItem(
  collection: AdminCollectionKey,
  item: AdminCollectionItem,
  body: Record<string, string>,
): Promise<AdminCollectionItem> {
  return updateApi<AdminCollectionItem, Record<string, string>>(
    endpoints[collection],
    item.id,
    body,
  );
}

export async function deleteAdminItem(
  collection: AdminCollectionKey,
  item: AdminCollectionItem,
): Promise<void> {
  if (collection === "admin") {
    const finishLoading = startTopLoading();
    try {
      const response = await fetch(
        `${endpoints[collection]}/${encodeURIComponent(item.id)}/delete`,
        { method: "POST" },
      );
      const body = (await response.json()) as { code: number; message: string };
      if (!response.ok) {
        throw new Error(body.message || `Request failed with status ${response.status}`);
      }
    } finally {
      finishLoading();
    }
    return;
  }

  await deleteApi(endpoints[collection], item.id);
}
