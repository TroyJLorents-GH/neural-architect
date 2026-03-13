import { NextResponse } from "next/server";
import type { AIModel } from "@/lib/types";

interface HFModel {
  id: string;
  modelId: string;
  pipeline_tag?: string;
  tags?: string[];
  downloads?: number;
  likes?: number;
  private?: boolean;
}

interface HFSpace {
  id: string;
  status?: string;
  runtime?: { stage?: string };
  likes?: number;
}

export async function GET() {
  const token = process.env.HUGGINGFACE_TOKEN;

  if (!token) {
    return NextResponse.json({
      models: [],
      spaces: [],
      connected: false,
      error: "Hugging Face token not configured",
    });
  }

  try {
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch user's models and spaces in parallel
    const [modelsRes, spacesRes] = await Promise.all([
      fetch("https://huggingface.co/api/models?author=me&limit=20", {
        headers,
        signal: AbortSignal.timeout(5000),
      }),
      fetch("https://huggingface.co/api/spaces?author=me&limit=20", {
        headers,
        signal: AbortSignal.timeout(5000),
      }),
    ]);

    const hfModels: HFModel[] = modelsRes.ok ? await modelsRes.json() : [];
    const hfSpaces: HFSpace[] = spacesRes.ok ? await spacesRes.json() : [];

    const models: AIModel[] = hfModels.map((m) => {
      const capabilities: string[] = [];
      if (m.pipeline_tag) capabilities.push(m.pipeline_tag);
      if (m.tags?.includes("text-generation")) capabilities.push("chat");
      if (m.tags?.includes("text2text-generation")) capabilities.push("chat");

      return {
        id: m.id || m.modelId,
        name: m.modelId || m.id,
        provider: "HuggingFace" as AIModel["provider"],
        capabilities: capabilities.length > 0 ? capabilities : ["model"],
        description: `${m.downloads?.toLocaleString() || 0} downloads | ${m.likes || 0} likes`,
      };
    });

    const spaces = hfSpaces.map((s) => ({
      id: s.id,
      name: s.id,
      status: s.runtime?.stage || s.status || "unknown",
      likes: s.likes || 0,
    }));

    return NextResponse.json({ models, spaces, connected: true });
  } catch (error) {
    return NextResponse.json({
      models: [],
      spaces: [],
      connected: false,
      error: String(error),
    });
  }
}
