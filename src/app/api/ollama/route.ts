import { NextResponse } from "next/server";
import type { AIModel } from "@/lib/types";

interface OllamaModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

interface OllamaRunningModel {
  name: string;
  model: string;
  size: number;
  expires_at: string;
}

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)}GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)}MB`;
}

export async function GET() {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";

  try {
    // Fetch installed models
    const modelsRes = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!modelsRes.ok) {
      return NextResponse.json({ models: [], running: [], error: "Ollama not reachable" });
    }

    const modelsData = await modelsRes.json();
    const ollamaModels: OllamaModel[] = modelsData.models || [];

    // Fetch currently running models
    let runningModels: OllamaRunningModel[] = [];
    try {
      const runningRes = await fetch(`${ollamaUrl}/api/ps`, {
        signal: AbortSignal.timeout(3000),
      });
      if (runningRes.ok) {
        const runningData = await runningRes.json();
        runningModels = runningData.models || [];
      }
    } catch {
      // ps endpoint may not exist in older versions
    }

    const runningNames = new Set(runningModels.map((m) => m.name));

    const models: (AIModel & { size: string; running: boolean; parameterSize?: string; quantization?: string })[] =
      ollamaModels.map((m) => {
        const capabilities: string[] = ["chat"];
        const lower = m.name.toLowerCase();
        if (lower.includes("code") || lower.includes("starcoder") || lower.includes("deepseek")) {
          capabilities.push("code");
        }
        if (lower.includes("vision") || lower.includes("llava") || lower.includes("bakllava")) {
          capabilities.push("vision");
        }
        if (lower.includes("embed")) {
          capabilities.length = 0;
          capabilities.push("embeddings");
        }

        return {
          id: m.digest || m.name,
          name: m.name,
          provider: "Ollama" as AIModel["provider"],
          capabilities,
          description: [
            m.details?.parameter_size,
            m.details?.quantization_level,
            formatSize(m.size),
          ]
            .filter(Boolean)
            .join(" | "),
          size: formatSize(m.size),
          running: runningNames.has(m.name),
          parameterSize: m.details?.parameter_size,
          quantization: m.details?.quantization_level,
        };
      });

    return NextResponse.json({
      models,
      running: runningModels.length,
      total: ollamaModels.length,
    });
  } catch {
    return NextResponse.json({
      models: [],
      running: 0,
      total: 0,
      error: "Ollama is not running",
    });
  }
}
