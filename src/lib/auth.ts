import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";

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
    async jwt({ token, account }) {
      if (account) {
        if (account.provider === "github") {
          token.accessToken = account.access_token;
          token.provider = "github";
        } else if (account.provider === "microsoft-entra-id") {
          token.azureAccessToken = account.access_token;
          token.provider = "microsoft-entra-id";
          // Keep GitHub token if already set
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.azureAccessToken = token.azureAccessToken as string;
      session.provider = token.provider as string;
      return session;
    },
  },
});
