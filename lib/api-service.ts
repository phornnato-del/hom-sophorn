export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type ListOptions = {
  page: number;
  pageSize: number;
  filter: string;
  signal?: AbortSignal;
};

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || body.data === null) {
    throw new Error(body.message || `Request failed with status ${response.status}`);
  }
  return body.data;
}

export async function listApi<T>(
  endpoint: string,
  { page, pageSize, filter, signal }: ListOptions,
): Promise<PaginatedResult<T>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (filter) params.set("filter", filter);

  const response = await fetch(`${endpoint}?${params.toString()}`, {
    cache: "no-store",
    signal,
  });
  return readResponse<PaginatedResult<T>>(response);
}

export async function createApi<T, TBody>(
  endpoint: string,
  body: TBody,
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readResponse<T>(response);
}

export async function updateApi<T, TBody>(
  endpoint: string,
  id: string,
  body: TBody,
): Promise<T> {
  const response = await fetch(`${endpoint}/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readResponse<T>(response);
}

export async function deleteApi(endpoint: string, id: string): Promise<void> {
  const response = await fetch(`${endpoint}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const body = (await response.json()) as ApiEnvelope<null>;
  if (!response.ok) {
    throw new Error(body.message || `Request failed with status ${response.status}`);
  }
}
