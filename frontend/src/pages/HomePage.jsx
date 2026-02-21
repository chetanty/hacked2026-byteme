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
      </main>
    </div>
  );
};

export default HomePage;
