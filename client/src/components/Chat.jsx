import { useEffect, useRef, useState } from "react";

function Sources({ sources }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="sources">
      <span className="sources-label">Sources:</span>
      {sources.map((s) => (
        <span
          key={s.number}
          className={`chip ${s.cited ? "cited" : "uncited"}`}
          title={s.snippet}
        >
          [{s.number}] {s.documentName}, p. {s.pageNumber}
        </span>
      ))}
    </div>
  );
}

export default function Chat({ messages, sending, error, scopeName, hasDocuments, onSend }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSubmit(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || sending) return;
    const ok = await onSend(question);
    if (ok) setInput("");
  }

  return (
    <main className="main">
      <div className="main-head">
        <strong>Ask your documents</strong>
        <span className="scope-label">Searching: {scopeName}</span>
      </div>

      <div className="messages">
        {messages.length === 0 && (
          <div className="empty">
            {hasDocuments
              ? "Ask a question about your documents. Answers include the page numbers they came from."
              : "Upload a PDF in the sidebar, then ask questions about it."}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div>{m.content}</div>
            {m.role === "assistant" && <Sources sources={m.sources} />}
          </div>
        ))}

        {sending && <div className="msg assistant thinking">Thinking...</div>}
        <div ref={bottomRef} />
      </div>

      {error && <div className="error">{error}</div>}

      <form className="composer" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder={hasDocuments ? "Ask a question..." : "Upload a PDF first"}
          value={input}
          maxLength={500}
          disabled={!hasDocuments}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={sending || !input.trim() || !hasDocuments}>
          Send
        </button>
      </form>
    </main>
  );
}