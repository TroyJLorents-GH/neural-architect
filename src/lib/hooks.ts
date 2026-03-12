"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { Repository, Pipeline, AIAgent, AIModel } from "./types";
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
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    staleTime: 2 * 60 * 1000, // 2 minutes
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
    staleTime: 10 * 60 * 1000, // 10 minutes
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
      // If Azure returns agents, use them; otherwise fall back to mock
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

export function useAzureModels() {
  const { data: session } = useSession();

  return useQuery<AIModel[]>({
    queryKey: ["azure-models"],
    queryFn: async () => {
      const res = await fetch("/api/azure/models");
      if (!res.ok) throw new Error("Failed to fetch models");
      const data = await res.json();
      return data.models !== undefined && data.models.length === 0
        ? mockModels
        : data.length > 0
        ? data
        : mockModels;
    },
    enabled: !!session?.user,
    placeholderData: mockModels,
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
