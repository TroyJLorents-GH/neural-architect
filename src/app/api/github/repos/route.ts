import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Repository } from "@/lib/types";

const REPOS_QUERY = `
  query($cursor: String, $since: GitTimestamp) {
    viewer {
      repositories(
        first: 30
        after: $cursor
        orderBy: { field: UPDATED_AT, direction: DESC }
        ownerAffiliations: OWNER
      ) {
        nodes {
          id
          name
          nameWithOwner
          description
          url
          isPrivate
          defaultBranchRef {
            name
          }
          primaryLanguage {
            name
          }
          languages(first: 5, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
              }
            }
            totalSize
          }
          stargazerCount
          forkCount
          issues(states: OPEN) {
            totalCount
          }
          updatedAt
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 100, since: $since) {
                  nodes {
                    committedDate
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const WEEKS = 12; // 90 days, bucketed into 12 weekly bins

function buildCommitActivity(
  commits: { committedDate: string }[] | undefined
): number[] {
  const bins = new Array(WEEKS).fill(0);
  if (!commits || commits.length === 0) return bins;

  const now = new Date();

  for (const commit of commits) {
    const date = new Date(commit.committedDate);
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    const weekIndex = Math.floor(diffDays / 7);
    if (weekIndex >= 0 && weekIndex < WEEKS) {
      // Reverse so index 0 = oldest week, last index = most recent
      bins[WEEKS - 1 - weekIndex]++;
    }
  }

  return bins;
}

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: REPOS_QUERY,
        variables: {
          since: new Date(
            Date.now() - WEEKS * 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: "GitHub API error", details: text },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.errors) {
      return NextResponse.json(
        { error: "GraphQL errors", details: data.errors },
        { status: 400 }
      );
    }

    const nodes = data.data.viewer.repositories.nodes;

    const repos: Repository[] = nodes.map(
      (node: {
        id: string;
        name: string;
        nameWithOwner: string;
        description: string | null;
        url: string;
        isPrivate: boolean;
        defaultBranchRef: {
          name: string;
          target?: {
            history?: {
              nodes: { committedDate: string }[];
            };
          };
        } | null;
        primaryLanguage: { name: string } | null;
        languages: {
          edges: { size: number; node: { name: string } }[];
          totalSize: number;
        };
        stargazerCount: number;
        forkCount: number;
        issues: { totalCount: number };
        updatedAt: string;
      }) => {
        const totalSize = node.languages.totalSize || 1;
        const languages: Record<string, number> = {};
        for (const edge of node.languages.edges) {
          languages[edge.node.name] = Math.round(
            (edge.size / totalSize) * 100
          );
        }

        const commitNodes =
          node.defaultBranchRef?.target?.history?.nodes;

        return {
          id: node.id,
          name: node.name,
          fullName: node.nameWithOwner,
          description: node.description,
          language: node.primaryLanguage?.name || null,
          languages,
          starCount: node.stargazerCount,
          forkCount: node.forkCount,
          openIssues: node.issues.totalCount,
          updatedAt: node.updatedAt,
          url: node.url,
          isPrivate: node.isPrivate,
          defaultBranch: node.defaultBranchRef?.name || "main",
          commitActivity: buildCommitActivity(commitNodes),
          provider: "github" as const,
        };
      }
    );

    return NextResponse.json(repos);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch repos", details: String(error) },
      { status: 500 }
    );
  }
}
