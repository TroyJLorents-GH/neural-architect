"use client";

import { useState, useEffect, useCallback } from "react";
import { SiGithub, SiGitlab, SiOpenai, SiAnthropic, SiGooglecloud } from "react-icons/si";
import { FaAws, FaMicrosoft } from "react-icons/fa6";

const CYCLE_INTERVAL = 4000;

const navItems = [
  "Dashboard", "Repositories", "Pipelines", "AI Agents",
  "Models", "Azure", "AWS", "GCP", "Infrastructure",
];

interface TabContent {
  title: string;
  subtitle: string;
  cards: { icon: React.ReactNode; name: string; detail: string; badge?: string; status?: string }[];
  stats?: { label: string; value: number }[];
}

const tabContents: Record<string, TabContent> = {
  Dashboard: {
    title: "Dashboard",
    subtitle: "Overview of your AI workspace",
    stats: [
      { label: "Repositories", value: 24 },
      { label: "Pipelines", value: 7 },
      { label: "AI Agents", value: 5 },
      { label: "Models", value: 12 },
    ],
    cards: [
      { icon: <SiOpenai className="h-4 w-4" />, name: "GPT-4o", detail: "Azure", badge: "chat" },
      { icon: <SiAnthropic className="h-4 w-4 text-[#d97757]" />, name: "Claude Opus 4.6", detail: "Anthropic", badge: "chat" },
      { icon: <SiOpenai className="h-4 w-4" />, name: "GPT-5.2", detail: "OpenAI", badge: "reasoning" },
      { icon: <SiGooglecloud className="h-4 w-4 text-[#4285f4]" />, name: "Gemini 2.5", detail: "Google", badge: "multimodal" },
    ],
  },
  Azure: {
    title: "Azure",
    subtitle: "Subscriptions, resources, and AI services",
    stats: [
      { label: "Resources", value: 52 },
      { label: "AI Services", value: 4 },
      { label: "Agents", value: 5 },
      { label: "Databases", value: 3 },
    ],
    cards: [
      { icon: <FaMicrosoft className="h-4 w-4 text-[#00a4ef]" />, name: "PersonalAssistant", detail: "AI Agent", status: "active" },
      { icon: <FaMicrosoft className="h-4 w-4 text-[#00a4ef]" />, name: "ResumeAgent", detail: "AI Agent", status: "active" },
      { icon: <FaMicrosoft className="h-4 w-4 text-[#00a4ef]" />, name: "troy-ai-search", detail: "AI Search", status: "running" },
      { icon: <FaMicrosoft className="h-4 w-4 text-[#00a4ef]" />, name: "v1-cosmos-free", detail: "Cosmos DB", status: "running" },
    ],
  },
  AWS: {
    title: "AWS",
    subtitle: "Lambda, EC2, S3, and databases",
    stats: [
      { label: "Lambda", value: 1 },
      { label: "EC2", value: 0 },
      { label: "S3 Buckets", value: 4 },
      { label: "Total", value: 6 },
    ],
    cards: [
      { icon: <FaAws className="h-4 w-4 text-[#ff9900]" />, name: "test-bmi-calc", detail: "Lambda · us-west-2", badge: "nodejs24.x" },
      { icon: <FaAws className="h-4 w-4 text-[#ff9900]" />, name: "new-dragon-website", detail: "S3 Bucket", status: "active" },
      { icon: <FaAws className="h-4 w-4 text-[#ff9900]" />, name: "s3tjlbucketpractice", detail: "S3 Bucket", status: "active" },
      { icon: <FaAws className="h-4 w-4 text-[#ff9900]" />, name: "elasticbeanstalk-us", detail: "S3 Bucket", status: "active" },
    ],
  },
  GCP: {
    title: "Google Cloud",
    subtitle: "Projects, VMs, Functions, and Storage",
    stats: [
      { label: "Projects", value: 4 },
      { label: "Functions", value: 2 },
      { label: "Storage", value: 3 },
      { label: "Total", value: 9 },
    ],
    cards: [
      { icon: <SiGooglecloud className="h-4 w-4 text-[#4285f4]" />, name: "resume-match-ai", detail: "Project", status: "active" },
      { icon: <SiGooglecloud className="h-4 w-4 text-[#4285f4]" />, name: "cloud-functions-demo", detail: "Cloud Function", badge: "nodejs20" },
      { icon: <SiGooglecloud className="h-4 w-4 text-[#4285f4]" />, name: "api-gateway-prod", detail: "Cloud Run", status: "running" },
      { icon: <SiGooglecloud className="h-4 w-4 text-[#4285f4]" />, name: "app-storage-bucket", detail: "Cloud Storage", status: "active" },
    ],
  },
  Repositories: {
    title: "Repositories",
    subtitle: "All connected repos across providers",
    cards: [
      { icon: <SiGithub className="h-4 w-4" />, name: "neural-architect", detail: "TypeScript · GitHub", badge: "public" },
      { icon: <SiGithub className="h-4 w-4" />, name: "job-nexus", detail: "TypeScript · GitHub", badge: "public" },
      { icon: <SiGitlab className="h-4 w-4 text-[#fc6d26]" />, name: "ml-pipeline", detail: "Python · GitLab", badge: "private" },
      { icon: <SiGithub className="h-4 w-4" />, name: "doc-intel-hub", detail: "Python · GitHub", badge: "public" },
    ],
  },
};

const cycleKeys = ["Dashboard", "Azure", "AWS", "GCP", "Repositories"];

function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(value / (duration / 30)));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{display}</>;
}

export function AnimatedPreview() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [fadeKey, setFadeKey] = useState(0);

  const cycleTab = useCallback(() => {
    setActiveTab((prev) => {
      const idx = cycleKeys.indexOf(prev);
      return cycleKeys[(idx + 1) % cycleKeys.length];
    });
    setFadeKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(cycleTab, CYCLE_INTERVAL);
    return () => clearInterval(timer);
  }, [isAutoPlaying, cycleTab]);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setFadeKey((k) => k + 1);
    setIsAutoPlaying(false);
    // Resume autoplay after 10 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const content = tabContents[activeTab] || tabContents.Dashboard;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/10 dark:shadow-black/40">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <div className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <div className="mx-auto rounded-md bg-muted px-12 py-1 text-xs text-muted-foreground">
          localhost:3000/dashboard
        </div>
      </div>

      <div className="flex" style={{ minHeight: 380 }}>
        {/* Mini sidebar */}
        <div className="hidden w-48 shrink-0 border-r border-border bg-card p-3 sm:block">
          <div className="mb-4 flex items-center gap-2 px-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
              NA
            </div>
            <span className="text-xs font-semibold">Neural Architect</span>
          </div>
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => handleTabClick(item)}
              className={`mb-1 w-full text-left rounded-md px-2 py-1.5 text-xs transition-all duration-300 ${
                activeTab === item
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {item}
            </button>
          ))}

          {/* Autoplay indicator */}
          <div className="mt-4 px-2">
            <div className="h-0.5 rounded-full bg-muted overflow-hidden">
              {isAutoPlaying && (
                <div
                  key={fadeKey}
                  className="h-full bg-primary/40 rounded-full"
                  style={{
                    animation: `progress ${CYCLE_INTERVAL}ms linear`,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div
          key={fadeKey}
          className="flex-1 p-4 sm:p-6"
          style={{ animation: "fadeSlideIn 0.4s ease-out" }}
        >
          {/* Header */}
          <div className="mb-4">
            <h3 className="text-sm font-bold">{content.title}</h3>
            <p className="text-[10px] text-muted-foreground">{content.subtitle}</p>
          </div>

          {/* Stat cards */}
          {content.stats && (
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {content.stats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border p-3">
                  <p className="text-lg font-bold sm:text-2xl">
                    <AnimatedNumber key={`${fadeKey}-${stat.label}`} value={stat.value} />
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Resource cards */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {content.cards.map((card, i) => (
              <div
                key={card.name}
                className="rounded-lg border border-border p-3 transition-all hover:border-primary/20 hover:shadow-sm"
                style={{
                  animation: `fadeSlideIn 0.4s ease-out ${i * 100}ms both`,
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  {card.icon}
                  <div className="flex items-center gap-1.5">
                    {card.status && (
                      <span className="flex items-center gap-1 text-[10px]">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          card.status === "active" || card.status === "running"
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-gray-400"
                        }`} />
                        <span className="text-muted-foreground">{card.status}</span>
                      </span>
                    )}
                    {card.badge && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        {card.badge}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs font-medium truncate">{card.name}</p>
                <p className="text-[10px] text-muted-foreground">{card.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
