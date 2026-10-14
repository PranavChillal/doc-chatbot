const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

// There are no accounts, so each browser makes up a random id and sends it with every request.
// The server saves chats under it, so visitors only see their own chats.
let memoryId = null;
function getClientId() {
  try {
    let id = localStorage.getItem("docchat-client-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("docchat-client-id", id);
    }
    return id;
  } catch {
    // storage blocked: use an id that lasts until the page is closed
    if (!memoryId) memoryId = crypto.randomUUID();
    return memoryId;
  }
}

// One place that talks to the server and turns failures into readable errors
async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...(options.headers || {}), "X-Client-Id": getClientId() },
    });
  } catch {
    throw new Error("Could not reach the server. Is it running?");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // some responses have no body
  }

  if (!res.ok) {
    throw new Error(data?.error || "Something went wrong.");
  }
  return data;
}

const jsonHeaders = { "Content-Type": "application/json" };

export const api = {
  listDocuments: () => request("/api/documents"),

  uploadDocument: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/documents", { method: "POST", body: form });
  },

  deleteDocument: (id) => request(`/api/documents/${id}`, { method: "DELETE" }),

  listConversations: () => request("/api/conversations"),

  createConversation: (documentId) =>
    request("/api/conversations", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(documentId ? { documentId } : {}),
    }),

  getConversation: (id) => request(`/api/conversations/${id}`),

  deleteConversation: (id) => request(`/api/conversations/${id}`, { method: "DELETE" }),

  ask: (conversationId, question) =>
    request("/api/chat", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ conversationId, question }),
    }),
};