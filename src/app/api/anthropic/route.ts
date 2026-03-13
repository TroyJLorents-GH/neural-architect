import { NextResponse } from "next/server";
import type { AIModel } from "@/lib/types";

// Anthropic doesn't have a models list endpoint yet,
// so we maintain a curated list and check API connectivity
const ANTHROPIC_MODELS: AIModel[] = [
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    provider: "Anthropic",
    capabilities: ["chat", "code", "analysis", "vision"],
    description: "Most capable model — complex reasoning and analysis",
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    capabilities: ["chat", "code", "analysis", "vision"],
    description: "Balanced performance and speed",
  },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    capabilities: ["chat", "code", "vision"],
    description: "Fastest and most cost-efficient",
  },
];

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      models: ANTHROPIC_MODELS,
      connected: false,
      error: "Anthropic API key not configured — showing available models",
    });
  }

  // Verify the API key works by checking available models
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      const apiModels: AIModel[] = (data.data || []).map(
        (m: { id: string; display_name?: string; created_at?: string }) => {
          const capabilities: string[] = ["chat", "code"];
          const id = m.id.toLowerCase();
          if (id.includes("opus")) capabilities.push("analysis", "vision");
          if (id.includes("sonnet")) capabilities.push("analysis", "vision");
          if (id.includes("haiku")) capabilities.push("vision");

          return {
            id: m.id,
            name: m.display_name || m.id,
            provider: "Anthropic" as const,
            capabilities,
            description: m.created_at
              ? `Created ${new Date(m.created_at).toLocaleDateString()}`
              : "Anthropic Claude model",
          };
        }
      );

      return NextResponse.json({
        models: apiModels.length > 0 ? apiModels : ANTHROPIC_MODELS,
        connected: true,
      });
    }

    return NextResponse.json({
      models: ANTHROPIC_MODELS,
      connected: false,
      error: "API key invalid",
    });
  } catch {
    return NextResponse.json({
      models: ANTHROPIC_MODELS,
      connected: false,
      error: "Could not reach Anthropic API",
    });
  }
}
