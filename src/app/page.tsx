"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  GitBranch,
  Bot,
  Brain,
  Server,
  Workflow,
  Shield,
  Zap,
  GripVertical,
  Sun,
  Moon,
  Check,
  Loader2,
} from "lucide-react";
import { SiGithub, SiGitlab, SiOpenai, SiAnthropic, SiOllama, SiHuggingface, SiVercel, SiGooglecloud } from "react-icons/si";
import { FaAws, FaMicrosoft } from "react-icons/fa6";
import { AnimatedPreview } from "@/components/landing/animated-preview";

const features = [
  {
    icon: GitBranch,
    title: "Multi-Provider Repos",
    description:
      "Connect GitHub, GitLab, and Azure DevOps. See all your repositories with 90-day commit sparklines in one view.",
  },
  {
    icon: Workflow,
    title: "Pipeline Aggregation",
    description:
      "One entry per workflow per repo across all your CI/CD providers. No more switching between GitHub Actions and Azure Pipelines.",
  },
  {
    icon: Bot,
    title: "AI Agent Monitoring",
    description:
      "Track your Azure Foundry agents, invocation counts, and status. See which agents are active and their last activity.",
  },
  {
    icon: Brain,
    title: "Model Registry",
    description:
      "Aggregate models from OpenAI, Anthropic, Azure, Ollama, and HuggingFace. See local running models in real time.",
  },
  {
    icon: Server,
    title: "Infrastructure Discovery",
    description:
      "Auto-discover Azure subscriptions, VMs, databases, AI services, and Foundry endpoints. No manual configuration.",
  },
  {
    icon: GripVertical,
    title: "Customizable Layout",
    description:
      "Drag to reorder dashboard sections. Collapse what you don't need. Your layout persists across sessions.",
  },
];

const providers: { name: string; icon: React.ReactNode; status: string }[] = [
  { name: "GitHub", icon: <SiGithub className="h-6 w-6" />, status: "live" },
  { name: "Azure", icon: <FaMicrosoft className="h-6 w-6 text-[#00a4ef]" />, status: "live" },
  { name: "OpenAI", icon: <SiOpenai className="h-6 w-6" />, status: "live" },
  { name: "Anthropic", icon: <SiAnthropic className="h-6 w-6 text-[#d97757]" />, status: "live" },
  { name: "Ollama", icon: <SiOllama className="h-6 w-6" />, status: "live" },
  { name: "HuggingFace", icon: <SiHuggingface className="h-6 w-6 text-[#ffd21e]" />, status: "live" },
  { name: "Vercel", icon: <SiVercel className="h-6 w-6" />, status: "live" },
  { name: "GitLab", icon: <SiGitlab className="h-6 w-6 text-[#fc6d26]" />, status: "live" },
  { name: "AWS", icon: <FaAws className="h-6 w-6 text-[#ff9900]" />, status: "live" },
  { name: "GCP", icon: <SiGooglecloud className="h-6 w-6 text-[#4285f4]" />, status: "live" },
];

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<
    "idle" | "loading" | "success" | "duplicate" | "error"
  >("idle");
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.alreadySignedUp) {
        setSubmitState("duplicate");
      } else if (res.ok) {
        setSubmitState("success");
        setWaitlistCount(data.position);
      } else {
        setSubmitState("error");
      }
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              NA
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Neural Architect
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Sun className="h-4 w-4 hidden dark:block" />
              <Moon className="h-4 w-4 block dark:hidden" />
            </button>
            <Link
              href="/dashboard"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-20">
        <div className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Zap className="h-3 w-3" />
            Currently in development — join the waitlist
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Your AI workspace.{" "}
            <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 bg-clip-text text-transparent">
              One dashboard.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Aggregate repos, pipelines, AI agents, models, and cloud
            infrastructure from every provider into a single, customizable
            command center.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {submitState === "success" || submitState === "duplicate" ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                {submitState === "duplicate"
                  ? "You're already on the list!"
                  : `You're #${waitlistCount} on the waitlist!`}
              </div>
            ) : (
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
              >
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={submitState === "loading"}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {submitState === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Get Early Access
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
          {submitState === "error" && (
            <p className="mt-2 text-sm text-red-500">
              Something went wrong. Please try again.
            </p>
          )}
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <AnimatedPreview />
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need. Nothing you don't.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Built for developers who work across multiple platforms and want
              one place to see it all.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-card p-6 transition-all hover:shadow-md hover:border-primary/20"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 text-base font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Providers */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Connect your stack
            </h2>
            <p className="mt-4 text-muted-foreground">
              Integrations that work out of the box. More coming soon.
            </p>
          </div>
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-5">
            {providers.map((p) => (
              <div
                key={p.name}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                  p.status === "live"
                    ? "border-border bg-card hover:border-primary/20 hover:shadow-sm"
                    : "border-dashed border-border/60 opacity-50"
                }`}
              >
                <span className="flex items-center justify-center h-8">{p.icon}</span>
                <span className="text-xs font-medium">{p.name}</span>
                {p.status === "soon" && (
                  <span className="text-[10px] text-muted-foreground">
                    Coming soon
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security callout */}
      <section className="border-t border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                Your data stays yours
              </h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                Neural Architect never stores your code, secrets, or API keys on
                our servers. All provider tokens stay in your environment. OAuth
                tokens are scoped to read-only access. Self-host it if you
                prefer — it's fully open source.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to simplify your workflow?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join the waitlist and be the first to know when Neural Architect
            launches.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {submitState === "success" || submitState === "duplicate" ? (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                You're on the waitlist
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
              >
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={submitState === "loading"}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {submitState === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Join Waitlist"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
              NA
            </div>
            <span className="text-xs text-muted-foreground">
              Neural Architect
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/TroyJLorents-GH/neural-architect"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
