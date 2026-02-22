import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

const Navbar = ({ onNavigate }) => {
  const navigate = useNavigate();
  const go = onNavigate || navigate;
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark",
  );

  useEffect(() => {
    document.body.classList.toggle("dark-theme", isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  return (
    <header className="navbar">
      <button className="nav-brand" type="button" onClick={() => go("/")}
      >
        {/* <div className="logo-badge">SM</div> */}
        <img className="logo-image" src={logo} alt="Cognify Logo" />
        <span className="logo-text">Cognify</span>
      </button>
      <div className="nav-right">
        <button
          className="nav-link nav-toggle"
          type="button"
          onClick={() => setIsDarkMode((prev) => !prev)}
        >
          {isDarkMode ? "Light" : "Dark"}
        </button>
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
