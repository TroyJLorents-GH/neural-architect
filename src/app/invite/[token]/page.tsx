"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { SiGithub, SiGitlab, SiGooglecloud } from "react-icons/si";
import { FaMicrosoft } from "react-icons/fa6";
import { Loader2 } from "lucide-react";

type InviteState = "loading" | "valid" | "invalid";

export default function InvitePage() {
  const params = useParams();
  const token = params.token as string;
  const [state, setState] = useState<InviteState>("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/invite/${token}`);
        const data = await res.json();
        if (data.valid) {
          setState("valid");
          setEmail(data.email || "");
          // Store token in sessionStorage so we can link the account after sign-in
          sessionStorage.setItem("na-invite-token", token);
        } else {
          setState("invalid");
        }
      } catch {
        setState("invalid");
      }
    }
    validate();
  }, [token]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Validating your invite...</p>
        </div>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md text-center px-6">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
            <span className="text-3xl">✕</span>
          </div>
          <h1 className="text-2xl font-bold mb-3">Invalid Invite</h1>
          <p className="text-muted-foreground mb-6">
            This invite link is invalid or has expired. If you believe this is an error, please contact us.
          </p>
          <a
            href="/"
            className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  const providers = [
    {
      id: "github",
      name: "GitHub",
      icon: SiGithub,
      color: "hover:bg-[#24292e] hover:text-white hover:border-[#24292e]",
    },
    {
      id: "microsoft-entra-id",
      name: "Microsoft",
      icon: FaMicrosoft,
      color: "hover:bg-[#00a4ef] hover:text-white hover:border-[#00a4ef]",
    },
    {
      id: "gitlab",
      name: "GitLab",
      icon: SiGitlab,
      color: "hover:bg-[#fc6d26] hover:text-white hover:border-[#fc6d26]",
    },
    {
      id: "google",
      name: "Google",
      icon: SiGooglecloud,
      color: "hover:bg-[#4285f4] hover:text-white hover:border-[#4285f4]",
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-md w-full px-6">
        <div className="text-center mb-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl">
            NA
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Neural Architect</h1>
          <p className="text-muted-foreground">
            You&apos;ve been approved for early access
            {email && <span className="block text-sm mt-1 font-mono">{email}</span>}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center mb-4">
            Sign in with any provider to activate your account
          </p>
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => signIn(provider.id, { callbackUrl: "/dashboard" })}
              className={`flex w-full items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-all ${provider.color}`}
            >
              <provider.icon className="h-5 w-5" />
              Continue with {provider.name}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-8">
          Your account will be permanently activated after your first sign-in.
        </p>
      </div>
    </div>
  );
}
