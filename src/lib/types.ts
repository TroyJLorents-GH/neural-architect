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
  commitActivity: number[];
  provider: "github" | "gitlab" | "azure-devops" | "bitbucket";
}

export interface Pipeline {
  id: string;
  name: string;
  repoName: string;
  status: "success" | "failure" | "running" | "pending" | "cancelled";
  branch: string;
  duration: number;
  triggeredAt: string;
  provider: "github" | "gitlab" | "azure-devops" | "vercel" | "netlify";
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
  provider: "OpenAI" | "Anthropic" | "Google" | "Azure" | "Meta" | "Mistral" | "Ollama" | "HuggingFace";
  capabilities: string[];
  description: string;
}

export interface InfraResource {
  id: string;
  name: string;
  type: "vm" | "app-service" | "function" | "container" | "database" | "storage" | "ai" | "other";
  provider: "azure" | "aws" | "gcp" | "vercel" | "netlify";
  status: "running" | "stopped" | "error" | "deploying" | "unknown";
  region: string;
  url?: string;
  details?: Record<string, string>;
}

export interface DashboardStats {
  totalRepos: number;
  activePipelines: number;
  deployedAgents: number;
  availableModels: number;
  infraResources?: number;
}

export interface ConnectedAccount {
  provider: "github" | "gitlab" | "azure-devops" | "aws" | "vercel" | "netlify";
  username: string;
  connected: boolean;
  avatarUrl?: string;
}
