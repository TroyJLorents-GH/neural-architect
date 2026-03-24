import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import { cookies } from "next/headers";

// We store provider tokens in separate secure cookies so signing into
// one provider doesn't erase the other provider's token.
const GITHUB_TOKEN_COOKIE = "na-gh-token";
const AZURE_TOKEN_COOKIE = "na-az-token";
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
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        const cookieStore = await cookies();

        if (account.provider === "github") {
          token.accessToken = account.access_token;
          token.githubName = profile?.login as string || profile?.name as string;
          token.githubImage = (profile as Record<string, unknown>)?.avatar_url as string;
          // Persist GitHub token so Microsoft sign-in doesn't lose it
          cookieStore.set(GITHUB_TOKEN_COOKIE, account.access_token || "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
          });
          cookieStore.set(GITHUB_USER_COOKIE, JSON.stringify({
            name: profile?.login || profile?.name,
            image: (profile as Record<string, unknown>)?.avatar_url,
          }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30,
          });
          // Restore Azure token if it was saved from a prior Microsoft sign-in
          const savedAzure = cookieStore.get(AZURE_TOKEN_COOKIE);
          if (savedAzure?.value) {
            token.azureAccessToken = savedAzure.value;
          }
        } else if (account.provider === "microsoft-entra-id") {
          token.azureAccessToken = account.access_token;
          // Persist Azure token
          cookieStore.set(AZURE_TOKEN_COOKIE, account.access_token || "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60, // 1 hour (Azure tokens expire ~1hr)
          });
          // Restore GitHub token from cookie
          const savedGithub = cookieStore.get(GITHUB_TOKEN_COOKIE);
          if (savedGithub?.value) {
            token.accessToken = savedGithub.value;
          }
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
      // If the current NextAuth session is Microsoft but we have a saved GitHub user, show GitHub user info
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
