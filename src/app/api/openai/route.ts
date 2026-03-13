import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { AIModel } from "@/lib/types";

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ models: [], usage: null, error: "OpenAI not configured" });
  }

  try {
    const client = new OpenAI({ apiKey });

    // Fetch models
    const modelsResponse = await client.models.list();
    const allModels = [];
    for await (const model of modelsResponse) {
      allModels.push(model);
    }

    // Filter to main models (skip fine-tune variants and snapshots)
    const relevantModels = allModels
      .filter((m) => {
        const id = m.id.toLowerCase();
        return (
          (id.includes("gpt") ||
            id.includes("o1") ||
            id.includes("o3") ||
            id.includes("o4") ||
            id.includes("dall-e") ||
            id.includes("tts") ||
            id.includes("whisper") ||
            id.includes("embedding")) &&
          !id.includes("ft:") &&
          !id.includes("instruct") &&
          !id.endsWith("-preview")
        );
      })
      .sort((a, b) => (b.created || 0) - (a.created || 0))
      .slice(0, 15);

    const models: AIModel[] = relevantModels.map((m) => {
      const capabilities: string[] = [];
      const id = m.id.toLowerCase();

      if (id.includes("gpt") || id.includes("o1") || id.includes("o3") || id.includes("o4")) {
        capabilities.push("chat", "code");
      }
      if (id.includes("4o") || id.includes("vision")) {
        capabilities.push("vision");
      }
      if (id.includes("o1") || id.includes("o3")) {
        capabilities.push("reasoning");
      }
      if (id.includes("dall-e")) {
        capabilities.push("image-gen");
      }
      if (id.includes("tts")) {
        capabilities.push("speech");
      }
      if (id.includes("whisper")) {
        capabilities.push("transcription");
      }
      if (id.includes("embedding")) {
        capabilities.push("embeddings");
      }

      return {
        id: m.id,
        name: m.id,
        provider: "OpenAI",
        capabilities,
        description: `Created ${new Date((m.created || 0) * 1000).toLocaleDateString()}`,
      };
    });

    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json({
      models: [],
      error: `OpenAI error: ${String(error)}`,
    });
  }
}
