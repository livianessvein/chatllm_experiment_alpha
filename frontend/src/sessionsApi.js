const API_BASE = window.location.origin;

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("chatllm_token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body?.detail || `Erro ${response.status}`;
    throw new Error(detail);
  }
  return response.json();
}

async function listSessions() {
  return apiFetch("/api/sessions");
}

async function createSession() {
  return apiFetch("/api/sessions", { method: "POST", body: JSON.stringify({}) });
}

async function getSession(sessionId) {
  return apiFetch(`/api/sessions/${sessionId}`);
}

async function updateSession(sessionId, title) {
  return apiFetch(`/api/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

async function deleteSession(sessionId) {
  const token = localStorage.getItem("chatllm_token");
  const headers = { Authorization: `Bearer ${token}` };
  const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
    method: "DELETE",
    headers,
  });
  if (!response.ok && response.status !== 204) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.detail || `Erro ${response.status}`);
  }
}

async function getSessionMessages(sessionId) {
  return apiFetch(`/api/sessions/${sessionId}/messages`);
}

window.listSessions = listSessions;
window.createSession = createSession;
window.getSession = getSession;
window.updateSession = updateSession;
window.deleteSession = deleteSession;
window.getSessionMessages = getSessionMessages;