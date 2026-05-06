import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import API from "../api/axios";
import "./shared.css";
import "./settings.css";

export default function Settings() {
  const navigate = useNavigate();

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState("");
  const [clearError, setClearError] = useState("");

  const handleClearHistory = async () => {
    setClearing(true);
    setClearSuccess("");
    setClearError("");
    try {
      await API.delete("/ai/history");
      setClearSuccess("Chat history cleared successfully.");
    } catch {
      setClearError("Failed to clear chat history. Please try again.");
    } finally {
      setClearing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="pageWrapper">
      <Sidebar active="Settings" />
      <main className="pageMain">
        <header className="topbar">
          <span style={{ fontWeight: 700, fontSize: 18, color: "#111" }}>Settings</span>
          <div className="profile">
            <div className="profileAvatar">{initials}</div>
            <b>{user.name || "User"}</b>
          </div>
        </header>

        <div className="pageContent">
          <div className="settingsContent">

            <div className="settingsSection">
              <h2 className="settingsSectionTitle">Profile</h2>
              <div className="profileRow">
                <div className="settingsAvatar">{initials}</div>
                <div>
                  <div className="settingsName">{user.name || "—"}</div>
                  <div className="settingsEmail">{user.email || "—"}</div>
                </div>
              </div>
            </div>

            <div className="settingsSection">
              <h2 className="settingsSectionTitle">AI Assistant</h2>
              <p className="settingsDesc">
                Clear your conversation history with the AI study assistant. This cannot be undone.
              </p>
              {clearError && <div className="errorMsg">{clearError}</div>}
              {clearSuccess && <div className="successMsg">{clearSuccess}</div>}
              <button className="dangerBtn" onClick={handleClearHistory} disabled={clearing}>
                {clearing ? "Clearing..." : "Clear Chat History"}
              </button>
            </div>

            <div className="settingsSection">
              <h2 className="settingsSectionTitle">Account</h2>
              <p className="settingsDesc">Sign out of your StudyFlow account.</p>
              <button className="btnPrimary" onClick={handleLogout}>
                Logout
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
