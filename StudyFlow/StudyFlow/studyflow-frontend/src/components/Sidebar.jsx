import React from "react";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "⌂", path: "/dashboard" },
  { label: "Courses", icon: "📖", path: "/courses" },
  { label: "Tasks", icon: "📋", path: "/tasks" },
  { label: "Calendar", icon: "📅", path: "/calendar" },
  { label: "Study Plan", icon: "🗓️", path: "/study-plan" },
  { label: "Settings", icon: "⚙️", path: "/settings" },
];

export default function Sidebar({ active }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <aside className="sidebar">
      <div>
        <div className="logo">
          📚 <span>StudyFlow</span>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className={`navItem ${active === item.label ? "active" : ""}`}
              onClick={() => item.path && navigate(item.path)}
              style={!item.path ? { opacity: 0.5, cursor: "default" } : {}}
            >
              <span>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
      </div>

      <div className="logout" onClick={handleLogout} style={{ cursor: "pointer" }}>
        <div className="logoutAvatar">
          {(() => {
            try {
              const u = JSON.parse(localStorage.getItem("user") || "{}");
              return u.name ? u.name[0].toUpperCase() : "U";
            } catch {
              return "U";
            }
          })()}
        </div>
        <span>Logout</span>
        <span>↪</span>
      </div>
    </aside>
  );
}
