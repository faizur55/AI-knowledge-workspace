import api from "./axios";

// --- Teams ---
export async function createTeam(name) {
  return (await api.post("/teams/", { name })).data;
}
export async function listTeams() {
  return (await api.get("/teams/")).data;
}
export async function inviteToTeam(teamId, email, role = "member") {
  return (await api.post(`/teams/${teamId}/invite`, { email, role })).data;
}
export async function acceptInvite(email, token) {
  return (await api.post("/teams/accept-invite", { email, token })).data;
}
export async function listTeamMembers(teamId) {
  return (await api.get(`/teams/${teamId}/members`)).data;
}

// --- Workspaces ---
export async function createWorkspace(name, teamId = null) {
  return (await api.post("/workspaces/", { name, team_id: teamId })).data;
}
export async function listWorkspaces() {
  return (await api.get("/workspaces/")).data;
}
export async function addDocumentToWorkspace(workspaceId, documentId) {
  return (await api.post(`/workspaces/${workspaceId}/documents`, { document_id: documentId })).data;
}
export async function removeDocumentFromWorkspace(workspaceId, documentId) {
  return (await api.delete(`/workspaces/${workspaceId}/documents/${documentId}`)).data;
}
export async function listWorkspaceDocuments(workspaceId) {
  return (await api.get(`/workspaces/${workspaceId}/documents`)).data;
}

// --- Agent / Study Pack ---
export async function generateStudyPack(documentId) {
  return (
    await api.post("/agent/study-pack", {
      document_id: documentId,
      request_text: "full study pack",
    })
  ).data;
}
export async function downloadStudyPackPdf(documentId, suggestedFilename) {
  const response = await api.get(`/agent/study-pack/${documentId}/pdf`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedFilename || `study_pack_${documentId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- Activity ---
export async function getActivityHistory() {
  return (await api.get("/activity/history")).data;
}
export async function getSuggestions() {
  return (await api.get("/activity/suggestions")).data;
}
