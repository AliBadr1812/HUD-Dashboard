// GitHub REST API + GraphQL types
// https://docs.github.com/en/rest

// ── Shared ────────────────────────────────────────────────────────────────────

export interface GitHubLabel {
  name: string;
  color: string;
  description?: string | null;
}

// ── Repositories ──────────────────────────────────────────────────────────────

export interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  open_issues_count: number;
  pushed_at: string;
  private: boolean;
}

// ── Issues & PRs ──────────────────────────────────────────────────────────────

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  labels: GitHubLabel[];
  html_url: string;
  created_at: string;
  updated_at: string;
  repository_url: string;
  draft?: boolean;
  pull_request?: { url: string; merged_at?: string | null };
}

export interface GitHubIssueSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubIssue[];
}

// ── Events ────────────────────────────────────────────────────────────────────

export interface GitHubPushPayload {
  ref?: string;
  commits?: Array<{ sha: string; message: string; author?: { name: string } }>;
}

export interface GitHubEvent {
  id: string;
  type: string;
  repo: { id: number; name: string; url: string };
  payload: GitHubPushPayload;
  created_at: string;
}

// ── GraphQL contributions ─────────────────────────────────────────────────────

export interface GitHubContributionDay {
  date: string;
  contributionCount: number;
}

export interface GitHubContributionWeek {
  contributionDays: GitHubContributionDay[];
}

export interface GitHubContributionsResponse {
  data: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          weeks: GitHubContributionWeek[];
        };
      };
    };
  };
}
