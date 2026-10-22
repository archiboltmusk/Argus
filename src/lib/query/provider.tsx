import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createArgusQueryClient } from "./client";

export function ArgusQueryProvider({ children }: { children: ReactNode }) {
  // One client per app mount — avoids sharing across HMR tear-downs incorrectly.
  const [client] = useState(() => createArgusQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
