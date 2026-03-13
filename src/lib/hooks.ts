"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { Repository, Pipeline, AIAgent, AIModel, InfraResource } from "./types";
import type { UserProfile } from "./cosmos";
import { mockRepos, mockPipelines, mockAgents, mockModels } from "./mock-data";

export function useGitHubRepos() {
  const { data: session } = useSession();

  return useQuery<Repository[]>({
    queryKey: ["github-repos"],
    queryFn: async () => {
      const res = await fetch("/api/github/repos");
      if (!res.ok) throw new Error("Failed to fetch repos");
      return res.json();
    },
    enabled: !!session?.accessToken,
    placeholderData: mockRepos,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGitHubPipelines() {
  const { data: session } = useSession();

  return useQuery<Pipeline[]>({
    queryKey: ["github-pipelines"],
    queryFn: async () => {
      const res = await fetch("/api/github/pipelines");
      if (!res.ok) throw new Error("Failed to fetch pipelines");
      return res.json();
    },
    enabled: !!session?.accessToken,
    placeholderData: mockPipelines,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAzureAgents() {
  const { data: session } = useSession();

  return useQuery<AIAgent[]>({
    queryKey: ["azure-agents"],
    queryFn: async () => {
      const res = await fetch("/api/azure/agents");
      if (!res.ok) throw new Error("Failed to fetch agents");
      const data = await res.json();
      return data.agents !== undefined && data.agents.length === 0
        ? mockAgents
        : data.length > 0
        ? data
        : mockAgents;
    },
    enabled: !!session?.user,
    placeholderData: mockAgents,
    staleTime: 10 * 60 * 1000,
  });
}

// Aggregates models from all configured providers
export function useAllModels() {
  const { data: session } = useSession();

  return useQuery<AIModel[]>({
    queryKey: ["all-models"],
    queryFn: async () => {
      const results = await Promise.allSettled([
        fetch("/api/azure/models").then((r) => r.ok ? r.json() : { models: [] }),
        fetch("/api/openai").then((r) => r.ok ? r.json() : { models: [] }),
        fetch("/api/anthropic").then((r) => r.ok ? r.json() : { models: [] }),
        fetch("/api/ollama").then((r) => r.ok ? r.json() : { models: [] }),
        fetch("/api/huggingface").then((r) => r.ok ? r.json() : { models: [] }),
      ]);

      const allModels: AIModel[] = [];

      for (const result of results) {
        if (result.status === "fulfilled") {
          const data = result.value;
          const models = data.models || (Array.isArray(data) ? data : []);
          allModels.push(...models);
        }
      }

      return allModels.length > 0 ? allModels : mockModels;
    },
    enabled: !!session?.user,
    placeholderData: mockModels,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOllamaModels() {
  return useQuery<{ models: AIModel[]; running: number; total: number }>({
    queryKey: ["ollama-models"],
    queryFn: async () => {
      const res = await fetch("/api/ollama");
      if (!res.ok) return { models: [], running: 0, total: 0 };
      return res.json();
    },
    staleTime: 30 * 1000, // 30 seconds — Ollama state changes frequently
    refetchInterval: 60 * 1000, // Poll every minute
  });
}

export function useInfrastructure() {
  const { data: session } = useSession();

  return useQuery<InfraResource[]>({
    queryKey: ["infrastructure"],
    queryFn: async () => {
      const res = await fetch("/api/infrastructure");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useVercelDeployments() {
  return useQuery<{ projects: unknown[]; deployments: unknown[]; connected: boolean }>({
    queryKey: ["vercel"],
    queryFn: async () => {
      const res = await fetch("/api/vercel");
      if (!res.ok) return { projects: [], deployments: [], connected: false };
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}

export interface ProviderStatus {
  github: boolean;
  azure: boolean;
  azureFoundry: boolean;
  azureInfra: boolean;
  openai: boolean;
  anthropic: boolean;
  ollama: boolean;
  huggingface: boolean;
  vercel: boolean;
}

export interface AzureDiscovery {
  connected: boolean;
  tokenSource: "oauth" | "service-principal" | "none";
  subscriptions: { subscriptionId: string; displayName: string; state: string }[];
  resourceSummary?: {
    total: number;
    vms: number;
    appServices: number;
    databases: number;
    containers: number;
    ai: number;
    storage: number;
  };
  aiServices: {
    id: string;
    name: string;
    type: string;
    endpoint?: string;
    location: string;
    subscription: string;
  }[];
  foundryEndpoints: { name: string; endpoint: string; location: string }[];
  error?: string;
}

export function useAzureDiscovery() {
  const { data: session } = useSession();

  return useQuery<AzureDiscovery>({
    queryKey: ["azure-discovery"],
    queryFn: async () => {
      const res = await fetch("/api/azure/discover");
      if (!res.ok) {
        return {
          connected: false,
          tokenSource: "none" as const,
          subscriptions: [],
          aiServices: [],
          foundryEndpoints: [],
        };
      }
      return res.json();
    },
    enabled: !!session?.user,
    staleTime: 10 * 60 * 1000,
  });
}

export function useProviderStatus() {
  return useQuery<ProviderStatus>({
    queryKey: ["provider-status"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) return {} as ProviderStatus;
      return res.json();
    },
    staleTime: 60 * 60 * 1000, // Rarely changes during a session
  });
}

export function useUserProfile() {
  const { data: session } = useSession();

  return useQuery<UserProfile>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!session?.user,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}
