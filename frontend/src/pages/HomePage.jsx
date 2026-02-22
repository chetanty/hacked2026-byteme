import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/home.css";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <Navbar onNavigate={navigate} />
      <main className="hero">
        <div className="hero-visual" aria-hidden="true">
          <span className="hero-emoji" role="img" aria-label="Book">📚</span>
        </div>
        <h1 className="hero-title">
          Master your material,
          <br />
          hands-free.
        </h1> 
        <p className="hero-subtitle">
          The conversational AI tutor that turns static PDFs into active study
          sessions.
        </p>
        <button
          className="cta-button"
          type="button"
          onClick={() => navigate("/chat")}
        >
          Chat with Agent
        </button>

        <section className="mission">
          <div className="mission-line" />
          <p className="mission-subtitle">Our mission</p>
          <p className="mission-text">
            Students with dyslexia or ADHD shouldn’t have to wrestle with dense PDFs alone. Cognify lets you
            talk through the material, listen to questions, and build retention through guided, voice-first
            quizzing—turning static pages into active recall.
          </p>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
