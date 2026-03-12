import { CosmosClient, type Container } from "@azure/cosmos";

let client: CosmosClient | null = null;
let usersContainer: Container | null = null;

function getClient(): CosmosClient {
  if (!client) {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;

    if (!endpoint || !key) {
      throw new Error("COSMOS_ENDPOINT and COSMOS_KEY must be set");
    }

    client = new CosmosClient({ endpoint, key });
  }
  return client;
}

async function getUsersContainer(): Promise<Container> {
  if (!usersContainer) {
    const cosmosClient = getClient();
    const { database } = await cosmosClient.databases.createIfNotExists({
      id: process.env.COSMOS_DATABASE || "neural-architect",
    });
    const { container } = await database.containers.createIfNotExists({
      id: "users",
      partitionKey: { paths: ["/userId"] },
    });
    usersContainer = container;
  }
  return usersContainer;
}

export interface UserProfile {
  id: string;
  userId: string; // partition key — matches NextAuth user id or email
  connectedProviders: {
    github?: { username: string; connectedAt: string };
    gitlab?: { username: string; connectedAt: string };
    azureDevops?: { org: string; connectedAt: string };
  };
  preferences: {
    theme: "light" | "dark" | "system";
    defaultView: string;
  };
  cachedStats?: {
    totalRepos: number;
    totalPipelines: number;
    lastUpdated: string;
  };
  createdAt: string;
  updatedAt: string;
}

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  try {
    const container = await getUsersContainer();
    const { resource } = await container.item(userId, userId).read();
    return resource || null;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === 404) {
      return null;
    }
    throw error;
  }
}

export async function upsertUserProfile(
  profile: UserProfile
): Promise<UserProfile> {
  const container = await getUsersContainer();
  profile.updatedAt = new Date().toISOString();
  const { resource } = await container.items.upsert(profile);
  return resource as unknown as UserProfile;
}

export async function createDefaultProfile(
  userId: string,
  githubUsername?: string
): Promise<UserProfile> {
  const now = new Date().toISOString();
  const profile: UserProfile = {
    id: userId,
    userId,
    connectedProviders: {
      ...(githubUsername && {
        github: { username: githubUsername, connectedAt: now },
      }),
    },
    preferences: {
      theme: "dark",
      defaultView: "dashboard",
    },
    createdAt: now,
    updatedAt: now,
  };
  return upsertUserProfile(profile);
}
