export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  languages: Record<string, number>;
  starCount: number;
  forkCount: number;
  openIssues: number;
  updatedAt: string;
  url: string;
  isPrivate: boolean;
  defaultBranch: string;
  commitActivity: number[]; // last 7 days of commit counts for sparkline
  provider: "github" | "gitlab" | "azure-devops";
}

export interface Pipeline {
  id: string;
  name: string;
  repoName: string;
  status: "success" | "failure" | "running" | "pending" | "cancelled";
  branch: string;
  duration: number; // seconds
  triggeredAt: string;
  provider: "github" | "gitlab" | "azure-devops";
}

export interface AIAgent {
  id: string;
  name: string;
  type: "research" | "code" | "data" | "workflow" | "assistant" | "custom";
  provider: "azure-foundry" | "openai" | "anthropic" | "custom";
  status: "active" | "inactive" | "error";
  description: string;
  lastInvocation: string | null;
  invocationCount: number;
}

export interface AIModel {
  id: string;
  name: string;
  provider: "OpenAI" | "Anthropic" | "Google" | "Azure" | "Meta" | "Mistral";
  capabilities: string[];
  description: string;
}

export interface DashboardStats {
  totalRepos: number;
  activePipelines: number;
  deployedAgents: number;
  availableModels: number;
}

export interface ConnectedAccount {
  provider: "github" | "gitlab" | "azure-devops" | "aws";
  username: string;
  connected: boolean;
  avatarUrl?: string;
}
