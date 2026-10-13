import { useRef } from "react";

export default function Sidebar({
  documents,
  conversations,
  activeId,
  uploading,
  scope,
  onScopeChange,
  onUpload,
  onDeleteDocument,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
}) {
  const fileInput = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets you pick the same file again later
    if (file) onUpload(file);
  }

  return (
    <aside className="sidebar">
      <h1 className="brand">DocChat</h1>

      <section>
        <div className="section-head">
          <h2>Documents</h2>
          <button
            type="button"
            className="small"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            {uploading ? "Indexing..." : "Upload PDF"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={handleFileChange}
          />
        </div>

        {uploading && (
          <p className="hint">Reading and indexing your PDF. Larger files can take a minute.</p>
        )}

        {documents.length === 0 ? (
          <p className="hint">No documents yet. Upload a PDF to start.</p>
        ) : (
          <ul className="list">
            {documents.map((d) => (
              <li key={d.id}>
                <div className="item-main">
                  <span className="item-title" title={d.originalName}>
                    {d.originalName}
                  </span>
                  <span className="item-sub">{d.pageCount} pages</span>
                </div>
                <button type="button" className="ghost" onClick={() => onDeleteDocument(d.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="section-head">
          <h2>Chats</h2>
          <button type="button" className="small" onClick={onNewChat}>
            New chat
          </button>
        </div>

        <label className="scope">
          New chats search:
          <select value={scope} onChange={(e) => onScopeChange(e.target.value)}>
            <option value="">All documents</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.originalName}
              </option>
            ))}
          </select>
        </label>

        {conversations.length === 0 ? (
          <p className="hint">No chats yet.</p>
        ) : (
          <ul className="list">
            {conversations.map((c) => (
              <li
                key={c.id}
                className={`clickable ${c.id === activeId ? "active" : ""}`}
                onClick={() => onSelectConversation(c.id)}
              >
                <div className="item-main">
                  <span className="item-title" title={c.title}>
                    {c.title}
                  </span>
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(c.id);
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}