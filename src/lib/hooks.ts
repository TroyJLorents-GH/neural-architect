"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { Repository, Pipeline } from "./types";
import { mockRepos, mockPipelines } from "./mock-data";

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
