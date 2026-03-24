import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    azureAccessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    azureAccessToken?: string;
    githubName?: string;
    githubImage?: string;
  }
}
