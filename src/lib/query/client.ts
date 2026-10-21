import { QueryClient } from "@tanstack/react-query";

/** Shared QueryClient for Argus — catalog, meta, and stream caches. */
export function createArgusQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Media metadata changes slowly; prefer cache during navigation.
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
