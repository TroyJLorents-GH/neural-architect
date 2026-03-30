import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import GitLab from "next-auth/providers/gitlab";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";

// We store provider tokens in separate secure cookies so signing into
// one provider doesn't erase another provider's token.
const GITHUB_TOKEN_COOKIE = "na-gh-token";
const AZURE_TOKEN_COOKIE = "na-az-token";
const GITLAB_TOKEN_COOKIE = "na-gl-token";
const GCP_TOKEN_COOKIE = "na-gcp-token";
const GITHUB_USER_COOKIE = "na-gh-user";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user repo",
        },
      },
    }),
    ...(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET
      ? [
          MicrosoftEntraId({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID || "common"}/v2.0`,
            authorization: {
              params: {
                scope:
                  "openid profile email https://management.azure.com/user_impersonation",
              },
            },
          }),
        ]
      : []),
    ...(process.env.GITLAB_CLIENT_ID && process.env.GITLAB_CLIENT_SECRET
      ? [
          GitLab({
            clientId: process.env.GITLAB_CLIENT_ID,
            clientSecret: process.env.GITLAB_CLIENT_SECRET,
            authorization: {
              url: "https://gitlab.com/oauth/authorize",
              params: {
                scope: "read_user read_api read_repository",
              },
            },
          }),
        ]
      : []),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                scope:
                  "openid profile email https://www.googleapis.com/auth/cloud-platform.read-only",
                access_type: "offline",
                prompt: "consent",
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        const cookieStore = await cookies();
        const cookieOpts = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax" as const,
        };

        if (account.provider === "github") {
          token.accessToken = account.access_token;
          token.githubName = profile?.login as string || profile?.name as string;
          token.githubImage = (profile as Record<string, unknown>)?.avatar_url as string;
          cookieStore.set(GITHUB_TOKEN_COOKIE, account.access_token || "", {
            ...cookieOpts,
            maxAge: 60 * 60 * 24 * 30, // 30 days
          });
          cookieStore.set(GITHUB_USER_COOKIE, JSON.stringify({
            name: profile?.login || profile?.name,
            image: (profile as Record<string, unknown>)?.avatar_url,
          }), {
            ...cookieOpts,
            maxAge: 60 * 60 * 24 * 30,
          });
        } else if (account.provider === "microsoft-entra-id") {
          token.azureAccessToken = account.access_token;
          cookieStore.set(AZURE_TOKEN_COOKIE, account.access_token || "", {
            ...cookieOpts,
            maxAge: 60 * 60, // 1 hour (Azure tokens expire ~1hr)
          });
        } else if (account.provider === "gitlab") {
          token.gitlabAccessToken = account.access_token;
          cookieStore.set(GITLAB_TOKEN_COOKIE, account.access_token || "", {
            ...cookieOpts,
            maxAge: 60 * 60 * 2, // 2 hours (GitLab tokens expire ~2hr)
          });
        } else if (account.provider === "google") {
          token.gcpAccessToken = account.access_token;
          cookieStore.set(GCP_TOKEN_COOKIE, account.access_token || "", {
            ...cookieOpts,
            maxAge: 60 * 60, // 1 hour (Google tokens expire ~1hr)
          });
        }

        // Restore all other provider tokens from cookies
        const restoreMap: [string, keyof typeof token][] = [
          [GITHUB_TOKEN_COOKIE, "accessToken"],
          [AZURE_TOKEN_COOKIE, "azureAccessToken"],
          [GITLAB_TOKEN_COOKIE, "gitlabAccessToken"],
          [GCP_TOKEN_COOKIE, "gcpAccessToken"],
        ];
        for (const [cookieName, tokenKey] of restoreMap) {
          if (!token[tokenKey]) {
            const saved = cookieStore.get(cookieName);
            if (saved?.value) {
              (token as Record<string, unknown>)[tokenKey] = saved.value;
            }
          }
        }

        // Restore GitHub user info from cookie
        if (!token.githubName) {
          const savedUser = cookieStore.get(GITHUB_USER_COOKIE);
          if (savedUser?.value) {
            try {
              const user = JSON.parse(savedUser.value);
              token.githubName = user.name;
              token.githubImage = user.image;
            } catch {}
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.azureAccessToken = token.azureAccessToken as string;
      session.gitlabAccessToken = token.gitlabAccessToken as string;
      session.gcpAccessToken = token.gcpAccessToken as string;
      // If we have a saved GitHub user, show GitHub user info
      if (token.githubName) {
        session.user = {
          ...session.user,
          name: token.githubName as string,
          image: token.githubImage as string || session.user?.image,
        };
      }
      return session;
    },
  },
});
