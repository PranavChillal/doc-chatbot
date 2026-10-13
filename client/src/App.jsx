import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";
import "./App.css";

const MAX_FILE_MB = 5;

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [scope, setScope] = useState(""); // "" means all documents
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const refreshDocuments = useCallback(async () => {
    try {
      setDocuments(await api.listDocuments());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      setConversations(await api.listConversations());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refreshDocuments();
    refreshConversations();
  }, [refreshDocuments, refreshConversations]);

  async function handleUpload(file) {
    setError("");
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File is too large. The limit is ${MAX_FILE_MB} MB.`);
      return;
    }
    setUploading(true);
    try {
      await api.uploadDocument(file);
      await refreshDocuments();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDocument(id) {
    if (!window.confirm("Delete this document and its indexed text?")) return;
    setError("");
    try {
      await api.deleteDocument(id);
      if (scope === id) setScope("");
      await refreshDocuments();
    } catch (e) {
      setError(e.message);
    }
  }

  function handleNewChat() {
    setActiveId(null);
    setMessages([]);
    setError("");
  }

  async function handleSelectConversation(id) {
    setError("");
    setActiveId(id);
    try {
      const convo = await api.getConversation(id);
      setMessages(convo.messages);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDeleteConversation(id) {
    if (!window.confirm("Delete this chat?")) return;
    setError("");
    try {
      await api.deleteConversation(id);
      if (id === activeId) handleNewChat();
      await refreshConversations();
    } catch (e) {
      setError(e.message);
    }
  }

  // Returns true if the question was answered, so the input box knows to clear itself
  async function handleSend(question) {
    setError("");
    setSending(true);
    let addedQuestion = false;
    try {
      let conversationId = activeId;
      if (!conversationId) {
        const convo = await api.createConversation(scope || null);
        conversationId = convo.id;
        setActiveId(convo.id);
      }

      setMessages((prev) => [...prev, { role: "user", content: question }]);
      addedQuestion = true;

      const result = await api.ask(conversationId, question);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.answer, sources: result.sources },
      ]);
      return true;
    } catch (e) {
      if (addedQuestion) setMessages((prev) => prev.slice(0, -1));
      setError(e.message);
      return false;
    } finally {
      setSending(false);
      refreshConversations();
    }
  }

  // Which document(s) is the current chat searching?
  const activeConversation = conversations.find((c) => c.id === activeId);
  const chatDocumentId = activeId ? activeConversation?.documentId : scope || null;
  const scopeName = chatDocumentId
    ? documents.find((d) => d.id === chatDocumentId)?.originalName || "one document"
    : "all documents";

  return (
    <div className="app">
      <Sidebar
        documents={documents}
        conversations={conversations}
        activeId={activeId}
        uploading={uploading}
        scope={scope}
        onScopeChange={setScope}
        onUpload={handleUpload}
        onDeleteDocument={handleDeleteDocument}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <Chat
        messages={messages}
        sending={sending}
        error={error}
        scopeName={scopeName}
        hasDocuments={documents.length > 0}
        onSend={handleSend}
      />
    </div>
  );
}