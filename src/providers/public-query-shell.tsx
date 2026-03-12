import type { ReactNode } from "react";

import { QueryClientProvider } from "@tanstack/react-query";

import { getQueryClient } from "@/lib/query-client";

interface PublicQueryShellProps {
  children: ReactNode;
}

export function PublicQueryShell({ children }: PublicQueryShellProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
