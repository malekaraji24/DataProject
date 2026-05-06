import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import API from "../api/axios";
import "./shared.css";
import "./studyplan.css";

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function StudyPlan() {
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [plan, setPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();

  useEffect(() => {
    API.get("/study-plans/latest")
      .then((res) => setPlan(res.data))
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    setSuccess("");
    try {
      const res = await API.post("/study-plans/generate", { hoursPerDay: Number(hoursPerDay) });
      setPlan(res.data.plan);
      setSuccess(`Plan generated: ${res.data.totalSessions} sessions across ${res.data.totalDays} days.`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate plan. Make sure you have pending tasks.");
    } finally {
      setGenerating(false);
    }
  };

  const grouped = plan?.schedule
    ? plan.schedule.reduce((acc, s) => {
        if (!acc[s.date]) acc[s.date] = [];
        acc[s.date].push(s);
        return acc;
      }, {})
    : {};
  const sortedDates = Object.keys(grouped).sort();

  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="pageWrapper">
      <Sidebar active="Study Plan" />
      <main className="pageMain">
        <header className="topbar">
          <div className="profile">
            <div className="profileAvatar">{initials}</div>
            <b>{user.name || "User"}</b>
          </div>
        </header>

        <div className="pageContent">
          <div className="pageHeader">
            <h1>Study Plan</h1>
            {plan && (
              <div className="planStats">
                <span className="statChip">📅 {sortedDates.length} days</span>
                <span className="statChip">📚 {plan.schedule.length} sessions</span>
                <span className="statChip">⏱ {plan.hoursPerDay}h/day</span>
              </div>
            )}
          </div>

          <div className="generateCard">
            <h3 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700 }}>
              {plan ? "Regenerate Plan" : "Generate Your Study Plan"}
            </h3>
            <p style={{ margin: "0 0 14px", color: "#6b7280", fontSize: 14 }}>
              Set how many hours you can study per day, then generate a smart schedule based on your tasks and deadlines.
            </p>
            <label style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>
              Study hours per day: <strong style={{ color: "#2da9e9" }}>{hoursPerDay}h</strong>
            </label>
            <div className="sliderRow">
              <input
                type="range"
                min="1"
                max="16"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Number(e.target.value))}
              />
              <input
                type="number"
                min="1"
                max="16"
                value={hoursPerDay}
                onChange={(e) => {
                  const v = Math.min(16, Math.max(1, Number(e.target.value)));
                  setHoursPerDay(v);
                }}
              />
            </div>
            {error && <div className="errorMsg">{error}</div>}
            {success && <div className="successMsg">{success}</div>}
            <button className="btnPrimary" onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : "✨ Generate Plan"}
            </button>
          </div>

          {loading ? (
            <div className="loadingState">Loading your study plan...</div>
          ) : !plan || sortedDates.length === 0 ? (
            <div className="emptyState">
              No study plan yet. Enter your daily hours and generate one above!
            </div>
          ) : (
            <div className="scheduleContainer">
              <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700 }}>Your Schedule</h2>
              {sortedDates.map((date) => {
                const sessions = grouped[date];
                const totalHours = sessions.reduce((sum, s) => sum + s.hoursAssigned, 0);
                return (
                  <div className="dateGroup" key={date}>
                    <div className="dateHeader">
                      <span>{formatDate(date)}</span>
                      <span className="dayTotalHours">{totalHours}h total</span>
                    </div>
                    {sessions.map((s, i) => (
                      <div className="sessionCard" key={i}>
                        <div className="sessionLeft">
                          <span className="coursePill">{s.courseName}</span>
                          <span className="sessionTitle">{s.taskTitle}</span>
                        </div>
                        <span className="hoursPill">{s.hoursAssigned}h</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
