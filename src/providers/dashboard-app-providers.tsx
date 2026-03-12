import type { ReactNode } from "react";

import { AIChatProvider } from "@/contexts/ai-chat-context";
import { ChatProvider } from "@/contexts/chat-context";
import { ReduxProvider } from "@/providers/ReduxProvider";

interface DashboardAppProvidersProps {
  children: ReactNode;
}

export function DashboardAppProviders({
  children,
}: DashboardAppProvidersProps) {
  return (
    <ReduxProvider>
      <AIChatProvider>
        <ChatProvider>{children}</ChatProvider>
      </AIChatProvider>
    </ReduxProvider>
  );
}
