import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import HistoryBackground from "../components/HistoryBackground";
import { getChatsWithCounts, getUploads, deleteChat } from "../db/indexedDb";
import "../styles/home.css";
import "../styles/history.css";
import "../styles/chat.css";

const formatDate = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDetails, setUploadDetails] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const list = await getChatsWithCounts();
        setChats(list);
        const details = {};
        await Promise.all(
          list.map(async (c) => {
            const uploads = await getUploads(c.id);
            details[c.id] = uploads;
          })
        );
        setUploadDetails(details);
      } catch (err) {
        console.error("History load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this chat and all its messages/uploads?")) return;
    await deleteChat(id);
    setChats((prev) => prev.filter((c) => c.id !== id));
    setUploadDetails((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="history-page">
      <HistoryBackground />
      <div className="history-overlay" aria-hidden="true" />
      <Navbar onNavigate={navigate} />
      <main className="history-content">
        <section className="history-hero">
          <span className="history-kicker">Session Library</span>
          <h1 className="history-title">Revisit your Cognify drills.</h1>
          <p className="history-subtitle">
            Past quizzes and chapter check-ins will live here. Track how your readiness bar
            trends over time and replay questions to sharpen weak spots.
          </p>
          <div className="history-cta">
            <button className="history-button" type="button" onClick={() => navigate("/chat")}>
              Start a new quiz
            </button>
            <button className="history-button secondary" type="button" onClick={() => navigate("/")}>
              Back to home
            </button>
          </div>
        </section>

        <section className="history-grid">
          {["Social Psychology", "Cognitive Biases", "Neurobiology"].map((topic) => (
            <article key={topic} className="history-card">
              <h3>{topic}</h3>
              <p>
                Recent sessions and readiness history for this chapter will appear once you start
                quizzing. Keep practicing to turn the bar greener.
              </p>
              <div className="history-tags">
                <span className="history-tag">Readiness: —</span>
                <span className="history-tag">Attempts: —</span>
              </div>
            </article>
          ))}
        </section>

        <section className="history-saved-section">
          <h2 className="history-section-title">Your saved chats</h2>
          {loading ? (
            <div className="history-loader">
              <div className="chat-loader">
                <div className="spinner" />
                <p>Loading…</p>
              </div>
            </div>
          ) : chats.length === 0 ? (
            <p className="history-empty-msg">No saved chats yet. Start quizzing to see them here.</p>
          ) : (
            <div className="history-grid">
              {chats.map((chat) => {
                const uploads = uploadDetails[chat.id] || [];
                return (
                  <article
                    key={chat.id}
                    className="history-card history-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/chat/${chat.id}`)}
                    onKeyDown={(e) => e.key === "Enter" && navigate(`/chat/${chat.id}`)}
                  >
                    <div className="history-card-header">
                      <h3>{chat.title === "New Chat" ? "Untitled chat" : chat.title}</h3>
                      <button
                        type="button"
                        className="history-delete"
                        aria-label="Delete chat"
                        onClick={(e) => handleDelete(e, chat.id)}
                      >
                        🗑️
                      </button>
                    </div>
                    <p className="history-card-meta">{formatDate(chat.updatedAt)}</p>
                    {uploads.length > 0 && (
                      <div className="history-uploads">
                        <span className="history-tag">📄 {uploads.length} upload(s)</span>
                        <ul className="history-upload-list">
                          {uploads.map((u) => (
                            <li key={u.id}>{u.fileName}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="history-tags">
                      <span className="history-tag">Messages: {chat.messageCount}</span>
                      <span className="history-tag">Uploads: {chat.uploadCount}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default HistoryPage;
