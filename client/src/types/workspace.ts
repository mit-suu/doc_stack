export interface SlashPrompt {
  id: string;
  command: string;
  description: string;
  icon: string;
  accentColor: string;
}

export interface RecentSession {
  id: string;
  title: string;
  preview: string;
  timeAgo: string;
  url?: string;
}

export interface WorkspaceContext {
  name: string;
  branch: string;
  activeDocumentsCount: number;
  isPro: boolean;
}
