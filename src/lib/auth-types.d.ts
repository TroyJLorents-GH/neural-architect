import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    azureAccessToken?: string;
    gitlabAccessToken?: string;
    gcpAccessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    azureAccessToken?: string;
    gitlabAccessToken?: string;
    gcpAccessToken?: string;
    githubName?: string;
    githubImage?: string;
  }
}
