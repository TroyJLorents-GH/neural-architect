"use client";

import { signOut } from "next-auth/react";

export default function WaitlistedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-md w-full text-center px-6">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl">
          NA
        </div>
        <h1 className="text-2xl font-bold mb-3">You&apos;re on the Waitlist</h1>
        <p className="text-muted-foreground mb-2">
          Thanks for your interest in Neural Architect! Your account hasn&apos;t been activated yet.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          You&apos;ll receive an email with an invite link once you&apos;re approved for early access.
        </p>

        <div className="space-y-3">
          <a
            href="/"
            className="block w-full rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Back to Home
          </a>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="block w-full rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
