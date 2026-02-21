import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/home.css";

const HistoryPage = () => {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <Navbar onNavigate={navigate} />
      <main className="hero">
        <h1 className="hero-title">History</h1>
        <p className="hero-subtitle">Past sessions will appear here.</p>
      </main>
    </div>
  );
};

export default HistoryPage;
