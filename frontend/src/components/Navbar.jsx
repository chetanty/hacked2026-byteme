import React from "react";
import { useNavigate } from "react-router-dom";

const Navbar = ({ onNavigate }) => {
  const navigate = useNavigate();
  const go = onNavigate || navigate;

  return (
    <header className="navbar">
      <div className="nav-left">
        <div className="logo-badge">SM</div>
        <span className="logo-text">SocraticMind</span>
      </div>
      <div className="nav-right">
        <button
          className="nav-link"
          type="button"
          onClick={() => go("/history")}
        >
          History
        </button>
        <button
          className="nav-button"
          type="button"
          onClick={() => go("/chat")}
        >
          New Chat
        </button>
      </div>
    </header>
  );
};

export default Navbar;
