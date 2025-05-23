// This file augments the HistoryState interface from TanStack Router
// to include custom state properties used during navigation.

declare module '@tanstack/react-router' {
  interface HistoryState {
    migratedConversationId?: string;
    isMigration?: boolean;
  }
}
