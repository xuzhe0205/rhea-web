import { apiFetch } from "@/lib/api";

export type ProjectDTO = {
  id: string;
  name: string;
  description?: string | null;
  summary?: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at?: string | null;
  conversation_count?: number;
};

export type ProjectConversationDTO = {
  id: string;
  title: string;
  preview?: string | null;
  created_at: string;
  updated_at: string;
  last_message_at?: string | null;
};

export async function listProjects(token: string) {
  return apiFetch<ProjectDTO[]>("/v1/projects", { method: "GET", token });
}

export async function createProject(
  token: string,
  payload: { name: string; description?: string },
) {
  return apiFetch<ProjectDTO>("/v1/projects", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function getProject(token: string, projectId: string) {
  return apiFetch<ProjectDTO>(`/v1/projects/${projectId}`, { method: "GET", token });
}

export async function updateProject(
  token: string,
  projectId: string,
  payload: { name?: string; description?: string },
) {
  return apiFetch<ProjectDTO>(`/v1/projects/${projectId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteProject(token: string, projectId: string) {
  return apiFetch<void>(`/v1/projects/${projectId}`, { method: "DELETE", token });
}

export async function listProjectConversations(token: string, projectId: string) {
  return apiFetch<ProjectConversationDTO[]>(`/v1/projects/${projectId}/conversations`, {
    method: "GET",
    token,
  });
}

export async function createProjectConversation(
  token: string,
  projectId: string,
  payload: { message: string; model?: string },
) {
  return apiFetch<{ id: string }>(`/v1/projects/${projectId}/conversations`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}
