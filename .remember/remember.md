# Handoff

## State
- Supabase waitlist integrated (`src/app/api/waitlist/route.ts`, `src/lib/supabase.ts`). Table created, RLS policies active. Project: `neural-architect` on `uvkpniopwagnolnbisze.supabase.co` (West US).
- Dedicated Azure section added (sidebar `Cloud` icon → `azure-view.tsx`). Shows subscriptions, resource summary, AI services, Foundry agents, model deployments, all resources.
- Font/theme overhauled: fixed Geist font variable chain (`--font-sans` → `--font-geist-sans`), indigo-tinted color palette replacing plain gray. See `globals.css`.
- Dual OAuth (GitHub + Microsoft) via cookie persistence in `src/lib/auth.ts`. Azure AD env vars added to `.env.local`. User still needs to add `user_impersonation` permission in Azure Portal and test OAuth flow.
- Sort toggles (A-Z/Z-A) added to repos, models, infra cards. Load More/Show Less on all three (8/6/6 initial limits).
- All changes are **uncommitted**. User prefers to commit when ready.

## Next
1. User should add Azure Service Management `user_impersonation` delegated permission in Azure Portal, then test Microsoft OAuth sign-in from Settings.
2. Test Supabase waitlist from landing page (form → Supabase Table Editor).
3. Continue toward multi-tenant SaaS: encrypted API key storage in Supabase per user (discussed but not built).

## Context
- User said "don't auto-commit" — saved as feedback memory. Always let user decide when to commit.
- Service Principal only sees Foundry resources (limited RBAC). Microsoft OAuth will show full subscription. That's why infra only showed 1 resource.
- Landing page preview uses generic repo names (not real ones) — user explicitly requested this.
- `.env.local` contains real API keys for GitHub, Azure SP, Azure AD, OpenAI, Anthropic, Vercel, Supabase.
