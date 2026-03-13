"use client";

import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AIModel } from "@/lib/types";

const providerColors: Record<string, { icon: string; text: string }> = {
  OpenAI: { icon: "text-emerald-500", text: "text-emerald-600" },
  Anthropic: { icon: "text-orange-500", text: "text-orange-600" },
  Google: { icon: "text-blue-500", text: "text-blue-600" },
  Azure: { icon: "text-sky-500", text: "text-sky-600" },
  Meta: { icon: "text-indigo-500", text: "text-indigo-600" },
  Mistral: { icon: "text-violet-500", text: "text-violet-600" },
  Ollama: { icon: "text-gray-500", text: "text-gray-600" },
  HuggingFace: { icon: "text-yellow-500", text: "text-yellow-600" },
};

const providerIcons: Record<string, string> = {
  OpenAI: "⚡",
  Anthropic: "🔶",
  Google: "◆",
  Azure: "☁",
  Meta: "◎",
  Mistral: "✦",
  Ollama: "🦙",
  HuggingFace: "🤗",
};

interface OllamaData {
  models: AIModel[];
  running: number;
  total: number;
}

interface ModelCardsProps {
  models: AIModel[];
  ollamaData?: OllamaData;
}

export function ModelCards({ models, ollamaData }: ModelCardsProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Available Models</h2>
          {ollamaData && ollamaData.total > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {ollamaData.running} local running
            </span>
          )}
        </div>
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          View All <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {models.map((model) => {
          const colors = providerColors[model.provider] || {
            icon: "text-gray-500",
            text: "text-gray-600",
          };
          return (
            <Card
              key={model.id}
              className="group transition-all hover:shadow-md hover:border-primary/20"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <span className="text-xl">
                    {providerIcons[model.provider] || "●"}
                  </span>
                  <span
                    className={`text-xs font-medium ${colors.text}`}
                  >
                    {model.provider}
                  </span>
                </div>
                <CardTitle className="text-base font-semibold">
                  {model.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {model.description}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {model.capabilities.map((cap) => (
                    <Badge
                      key={cap}
                      variant="secondary"
                      className="text-xs font-normal"
                    >
                      {cap}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
