"use client";

import { useEffect, useState } from "react";
import { listApi } from "@/lib/api-service";

type PublicCollectionState<T> = {
  items: T[];
  error: string;
  loading: boolean;
};

export function usePublicCollection<T>(endpoint: string) {
  const [state, setState] = useState<PublicCollectionState<T>>({
    items: [],
    error: "",
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();

    const loadCollection = async () => {
      const firstPage = await listApi<T>(endpoint, {
        page: 1,
        pageSize: 100,
        filter: "",
        signal: controller.signal,
      });
      const items = [...firstPage.items];

      for (let page = 2; page <= firstPage.totalPages; page += 1) {
        const nextPage = await listApi<T>(endpoint, {
          page,
          pageSize: 100,
          filter: "",
          signal: controller.signal,
        });
        items.push(...nextPage.items);
      }
      return items;
    };

    loadCollection()
      .then((items) => {
        if (!controller.signal.aborted) {
          setState({ items, error: "", loading: false });
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            items: [],
            error: cause instanceof Error ? cause.message : "Unable to load portfolio content.",
            loading: false,
          });
        }
      });

    return () => controller.abort();
  }, [endpoint]);

  return state;
}
