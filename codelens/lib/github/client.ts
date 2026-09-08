// Thin server-side wrapper around the GitHub REST API. Every function here
// takes an access token explicitly — tokens are never read from a global or
// exposed to client code. Callers must fetch the token server-side
// (see lib/github/oauth.ts) before calling any of these.

const GITHUB_API = "https://api.github.com";

export class GitHubApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "GitHubApiError";
  }
}

async function githubFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
    // Route handlers run server-side; no need to cache repo listings.
    cache: "no-store",
  });

  if (res.status === 401) {
    throw new GitHubApiError("GitHub token is invalid or expired.", 401);
  }
  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      throw new GitHubApiError("GitHub API rate limit exceeded. Try again shortly.", 429);
    }
    throw new GitHubApiError("GitHub denied access to this resource.", 403);
  }
  if (res.status === 404) {
    throw new GitHubApiError("Repository not found or not accessible.", 404);
  }
  if (!res.ok) {
    throw new GitHubApiError(`GitHub API error (${res.status})`, res.status);
  }
  return res.json();
}

export interface GitHubRepoSummary {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  owner: { login: string };
  default_branch: string;
  language: string | null;
  html_url: string;
  private: boolean;
  stargazers_count: number;
  updated_at: string;
}

export async function listUserRepositories(token: string): Promise<GitHubRepoSummary[]> {
  const repos: GitHubRepoSummary[] = [];
  let page = 1;
  // GitHub paginates at 100/page; cap at 5 pages (500 repos) to keep this bounded.
  while (page <= 5) {
    const batch: GitHubRepoSummary[] = await githubFetch(
      `/user/repos?per_page=100&page=${page}&sort=updated`,
      token
    );
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return repos;
}

export interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

export async function getRepoTree(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<GitHubTreeEntry[]> {
  const data = await githubFetch(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    token
  );
  if (data.truncated) {
    // Large monorepo: the analyzer still works, it just sees a partial tree.
    console.warn(`GitHub tree for ${owner}/${repo} was truncated by the API.`);
  }
  return data.tree ?? [];
}

export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string | null> {
  const data = await githubFetch(
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`,
    token
  );
  if (Array.isArray(data) || data.type !== "file" || !data.content) return null;
  try {
    return Buffer.from(data.content, data.encoding ?? "base64").toString("utf-8");
  } catch {
    return null; // binary or undecodable content
  }
}

export async function getRepoByFullName(token: string, owner: string, repo: string) {
  return githubFetch(`/repos/${owner}/${repo}`, token);
}
