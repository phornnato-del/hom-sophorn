export const DEFAULT_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 100;
const MAX_FILTER_LENGTH = 100;

export type PaginationParams = {
  page: number;
  pageSize: number;
  filter: string;
  skip: number;
};

export function parsePaginationParams(url: string):
  | { params: PaginationParams }
  | { error: string } {
  const searchParams = new URL(url).searchParams;
  const pageValue = searchParams.get("page");
  const pageSizeValue = searchParams.get("pageSize");
  const page = pageValue === null ? 1 : Number(pageValue);
  const pageSize = pageSizeValue === null ? DEFAULT_PAGE_SIZE : Number(pageSizeValue);
  const filter = (searchParams.get("filter") ?? "").trim();

  if (!Number.isSafeInteger(page) || page < 1) {
    return { error: "Page must be a positive integer" };
  }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    return { error: `Page size must be an integer between 1 and ${MAX_PAGE_SIZE}` };
  }
  if (filter.length > MAX_FILTER_LENGTH) {
    return { error: `Filter must be ${MAX_FILTER_LENGTH} characters or fewer` };
  }

  const skip = (page - 1) * pageSize;
  if (!Number.isSafeInteger(skip)) {
    return { error: "Page is too large" };
  }

  return {
    params: {
      page,
      pageSize,
      filter,
      skip,
    },
  };
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
