import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/home.css";
import "../styles/history.css";
import HistoryBackground from "../components/HistoryBackground";

const HistoryPage = () => {
  const navigate = useNavigate();

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
      </main>
    </div>
  );
};

export default HistoryPage;
