const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

// ---- Auth ----

export interface AuthResponse {
  token: string;
  email: string;
  plan: string;
}

export interface MeResponse {
  email: string;
  plan: string;
  github_username: string | null;
  github_connected: boolean;
}

export function getMe(token: string): Promise<MeResponse> {
  return request<MeResponse>("/auth/me", {}, token);
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function githubSignin(email: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/github-signin", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// ---- Projects ----

export interface Project {
  id: string;
  name: string;
  project_key: string;
  quality_gate_threshold: number;
}

export function getProjects(token: string): Promise<Project[]> {
  return request<Project[]>("/projects/", {}, token);
}

export function createProject(
  name: string,
  quality_gate_threshold: number,
  token: string
): Promise<Project> {
  return request<Project>(
    "/projects/",
    { method: "POST", body: JSON.stringify({ name, quality_gate_threshold }) },
    token
  );
}

export function deleteProject(id: string, token: string): Promise<void> {
  return request<void>(`/projects/${id}`, { method: "DELETE" }, token);
}

// ---- Dashboard ----

export interface DashboardData {
  project: {
    name: string;
    plan: string;
    quality_gate: string;
    quality_gate_threshold: number;
  };
  coverage: {
    current: number;
    previous: number;
    trend: string;
    history: { date: string; percent: number }[];
  };
  recent_pushes: {
    id: string;
    developer: string;
    branch: string;
    commit: string;
    timestamp: string;
    status: string;
    coverage_percent: number;
    failed_functions: {
      name: string;
      file: string;
      tests_generated: number;
      tests_passed: number;
      failure_output: string;
    }[];
  }[];
  files: { name: string; coverage: number; risk: string }[];
  ai_suggestions: string[];
}

export function getDashboard(projectId: string, token: string): Promise<DashboardData> {
  return request<DashboardData>(`/dashboard/${projectId}`, {}, token);
}

// ---- Billing ----

export interface BillingInfo {
  plan: string;
  ai_calls_used: number;
  ai_calls_limit: number;
  tests_generated: number;
}

export function getBilling(token: string): Promise<BillingInfo> {
  return request<BillingInfo>("/billing/", {}, token);
}

export function upgradePlan(plan: string, token: string): Promise<{ checkout_url: string }> {
  return request<{ checkout_url: string }>(
    "/billing/upgrade",
    { method: "POST", body: JSON.stringify({ plan }) },
    token
  );
}

export function setEnterpriseKey(apiKey: string, token: string): Promise<void> {
  return request<void>(
    "/billing/enterprise-key",
    { method: "POST", body: JSON.stringify({ api_key: apiKey }) },
    token
  );
}

// ---- GitHub ----

export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  language: string | null;
  updated_at: string;
  connected: boolean;
}

export function storeGitHubToken(githubToken: string, githubUsername: string, token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(
    "/github/store-token",
    { method: "POST", body: JSON.stringify({ github_token: githubToken, github_username: githubUsername }) },
    token
  );
}

export function disconnectGitHub(token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/github/disconnect", { method: "DELETE" }, token);
}

export function getGitHubRepos(token: string): Promise<GitHubRepo[]> {
  return request<GitHubRepo[]>("/github/repos", {}, token);
}

export function connectRepo(repoFullName: string, projectName: string, token: string): Promise<{ project_id: string; project_key: string; already_connected: boolean }> {
  return request<{ project_id: string; project_key: string; already_connected: boolean }>(
    "/github/connect",
    { method: "POST", body: JSON.stringify({ repo_full_name: repoFullName, project_name: projectName }) },
    token
  );
}
