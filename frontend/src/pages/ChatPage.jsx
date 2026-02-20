import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/home.css";

const ChatPage = () => {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <Navbar onNavigate={navigate} />
      <main className="hero">
        <h1 className="hero-title">Chat</h1>
        <p className="hero-subtitle">Your chat experience starts here.</p>
      </main>
    </div>
  );
};

export default ChatPage;
