import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { azureFetch } from "@/lib/azure-client";
import type { AIAgent } from "@/lib/types";

interface FoundryAgent {
  id: string;
  name: string;
  description?: string;
  properties?: {
    provisioningState?: string;
    [key: string]: unknown;
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if Azure is configured
  if (
    !process.env.AZURE_TENANT_ID ||
    !process.env.AZURE_CLIENT_ID ||
    !process.env.AZURE_CLIENT_SECRET
  ) {
    return NextResponse.json(
      { error: "Azure not configured", agents: [] },
      { status: 200 }
    );
  }

  const agents: AIAgent[] = [];

  // Fetch agents from each configured Foundry resource
  const endpoints = (process.env.AZURE_FOUNDRY_ENDPOINTS || "")
    .split(",")
    .filter(Boolean);

  for (const endpoint of endpoints) {
    try {
      const res = await azureFetch(
        `${endpoint.trim()}/assistants?api-version=2024-12-01-preview`,
        { method: "GET" }
      );

      if (!res.ok) {
        console.error(
          `Failed to fetch agents from ${endpoint}: ${res.status}`
        );
        continue;
      }

      const data = await res.json();
      const foundryAgents: FoundryAgent[] = data.data || data.value || [];

      for (const agent of foundryAgents) {
        agents.push({
          id: agent.id,
          name: agent.name || agent.id,
          type: "assistant",
          provider: "azure-foundry",
          status: "active",
          description: agent.description || "Azure Foundry Agent",
          lastInvocation: null,
          invocationCount: 0,
        });
      }
    } catch (error) {
      console.error(`Error fetching agents from ${endpoint}:`, error);
    }
  }

  return NextResponse.json(agents);
}
