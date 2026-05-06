import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import API from "../api/axios";
import "./shared.css";
import "./calendar.css";

const TYPE_COLORS = {
  exam: "#ef4444",
  assignment: "#2da9e9",
  quiz: "#8b5cf6",
  project: "#22c55e",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDayPanelDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allTasks, setAllTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayTasks, setDayTasks] = useState([]);
  const [loadingDay, setLoadingDay] = useState(false);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();

  useEffect(() => {
    API.get("/tasks")
      .then((res) => setAllTasks(res.data || []))
      .catch(() => {});
  }, []);

  const handleDateClick = async (dayNum) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
    const dateStr = toLocalDateString(clickedDate);
    setSelectedDate(dateStr);
    setLoadingDay(true);
    try {
      const res = await API.get(`/tasks/calendar?date=${dateStr}`);
      setDayTasks(res.data.tasks || []);
    } catch {
      setDayTasks([]);
    } finally {
      setLoadingDay(false);
    }
  };

  const prevMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDayOfMonth).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  const todayStr = toLocalDateString(new Date());

  const tasksByDate = allTasks.reduce((acc, task) => {
    if (!task.deadline) return acc;
    const key = task.deadline.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="pageWrapper">
      <Sidebar active="Calendar" />
      <main className="pageMain">
        <header className="topbar">
          <div className="profile">
            <div className="profileAvatar">{initials}</div>
            <b>{user.name || "User"}</b>
          </div>
        </header>

        <div className="pageContent">
          <div className="pageHeader">
            <h1>Calendar</h1>
          </div>

          <div className="calMonthNav">
            <button className="monthNavBtn" onClick={prevMonth}>‹</button>
            <span className="monthLabel">{MONTHS[month]} {year}</span>
            <button className="monthNavBtn" onClick={nextMonth}>›</button>
          </div>

          <div className="calendarWrapper">
            <div className="calendarMain">
              <div className="weekdayRow">
                {WEEKDAYS.map((d) => (
                  <div className="weekdayLabel" key={d}>{d}</div>
                ))}
              </div>

              <div className="calGrid">
                {cells.map((day, idx) => {
                  if (!day) return <div className="calCell empty" key={`e-${idx}`} />;
                  const cellDate = new Date(year, month, day);
                  const dateStr = toLocalDateString(cellDate);
                  const dayTaskList = tasksByDate[dateStr] || [];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;

                  return (
                    <div
                      key={dateStr}
                      className={`calCell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
                      onClick={() => handleDateClick(day)}
                    >
                      <span className="dayNum">{day}</span>
                      <div className="dotRow">
                        {dayTaskList.slice(0, 3).map((t, i) => (
                          <span
                            key={i}
                            className="taskDot"
                            style={{ background: TYPE_COLORS[t.type] || "#6b7280" }}
                            title={t.title}
                          />
                        ))}
                        {dayTaskList.length > 3 && (
                          <span className="moreDots">+{dayTaskList.length - 3}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="dayPanel">
              {!selectedDate ? (
                <div className="emptyState" style={{ padding: "30px 10px" }}>
                  Click a date to see tasks due that day.
                </div>
              ) : (
                <>
                  <div className="dayPanelHeader">{formatDayPanelDate(selectedDate)}</div>
                  {loadingDay ? (
                    <div className="loadingState" style={{ padding: 20 }}>Loading...</div>
                  ) : dayTasks.length === 0 ? (
                    <div className="emptyState" style={{ padding: "20px 0" }}>
                      No tasks due on this date.
                    </div>
                  ) : (
                    <div className="dayTaskList">
                      {dayTasks.map((t) => (
                        <div className="dayTaskItem" key={t._id}>
                          <span
                            className="dayTaskDot"
                            style={{ background: TYPE_COLORS[t.type] || "#6b7280" }}
                          />
                          <div>
                            <div className="dayTaskTitle">{t.title}</div>
                            <div className="dayTaskMeta">
                              <span style={{ color: TYPE_COLORS[t.type] || "#6b7280", fontWeight: 600, fontSize: 11, textTransform: "capitalize" }}>
                                {t.type}
                              </span>
                              <span style={{ color: "#9ca3af", fontSize: 12 }}>· {t.estimatedHours}h</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="calLegend">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <span className="legendItem" key={type}>
                <span className="legendDot" style={{ background: color }} />
                {type}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
