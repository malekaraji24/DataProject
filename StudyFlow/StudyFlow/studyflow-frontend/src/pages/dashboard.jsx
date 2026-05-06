import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import Sidebar from "../components/Sidebar";
import "./dashboard.css";

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function buildWeekEvents(tasks, weekStart) {
  const TYPE_COLORS = { exam: "red", assignment: "blue", quiz: "purple", project: "green" };
  const slots = Array(7).fill(null);
  tasks.forEach((task) => {
    if (!task.deadline || task.completed) return;
    const d = new Date(task.deadline);
    d.setHours(0, 0, 0, 0);
    const dayIndex = Math.round((d - weekStart) / 86400000);
    if (dayIndex >= 0 && dayIndex < 7 && !slots[dayIndex]) {
      slots[dayIndex] = {
        text: task.title.length > 10 ? task.title.slice(0, 10) + "…" : task.title,
        color: TYPE_COLORS[task.type] || "blue",
      };
    }
  });
  return slots;
}

function getCompletionPct(course) {
  if (!course.chapters?.length) return 0;
  return Math.round((course.chapters.filter((c) => c.completed).length / course.chapters.length) * 100);
}

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [rawTasks, setRawTasks] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const notifRef = useRef(null);
  const messagesEndRef = useRef(null);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [coursesRes, tasksRes] = await Promise.all([
          API.get("/courses"),
          API.get("/tasks"),
        ]);

        let studyPlan = null;
        try {
          const spRes = await API.get("/study-plans/latest");
          studyPlan = spRes.data;
        } catch {
          // no plan yet
        }

        const courses = coursesRes.data || [];
        const tasks = tasksRes.data || [];
        setRawTasks(tasks);
        const pendingTasks = tasks.filter((t) => !t.completed);

        const now = new Date();
        const upcomingExams = tasks
          .filter((t) => t.type === "exam" && !t.completed && new Date(t.deadline) > now)
          .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        const nextExam = upcomingExams.length
          ? `${upcomingExams[0].title} — ${new Date(upcomingExams[0].deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          : "None upcoming";

        const todayStr = new Date().toISOString().slice(0, 10);
        const studyHoursToday = studyPlan
          ? (studyPlan.schedule || [])
              .filter((s) => s.date === todayStr)
              .reduce((sum, s) => sum + s.hoursAssigned, 0)
          : 0;

        const weekStart = getWeekStart();
        const weekEvents = buildWeekEvents(tasks, weekStart);

        const futureSessions = (studyPlan?.schedule || [])
          .filter((s) => s.date >= todayStr)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 3)
          .map((s) => ({
            time: new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            title: s.taskTitle,
            progress: 50,
          }));

        setUserData({
          activeCourses: courses.length,
          pendingTasks: pendingTasks.length,
          nextExam,
          studyHoursToday,
          courses: courses.map((c) => ({
            name: c.name,
            sub: c.instructor,
            progress: getCompletionPct(c),
          })),
          studyPlan: futureSessions,
          weekEvents,
          hasCourses: courses.length > 0,
          hasStudyPlan: !!studyPlan,
        });
      } catch (error) {
        console.error("Dashboard fetch error:", error);
        setUserData({
          activeCourses: 0,
          pendingTasks: 0,
          nextExam: "None upcoming",
          studyHoursToday: 0,
          courses: [],
          studyPlan: [],
          weekEvents: Array(7).fill(null),
          hasCourses: false,
          hasStudyPlan: false,
        });
      }
    };

    fetchDashboardData();
  }, []);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatSending]);

  const loadHistory = async () => {
    try {
      const res = await API.get("/ai/history");
      setChatMessages(res.data.messages || []);
    } catch {
      // history unavailable, start fresh
    }
    setChatLoaded(true);
  };

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatInput("");
    setChatSending(true);
    try {
      const res = await API.post("/ai/suggest", { message: text });
      setChatMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      const display = serverMsg || "Sorry, I couldn't reach the AI. Please try again.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: display }]);
    } finally {
      setChatSending(false);
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const searchResults = q
    ? [
        ...(userData?.courses || [])
          .filter((c) => c.name.toLowerCase().includes(q))
          .map((c) => ({ type: "course", label: c.name, sub: c.sub, path: "/courses" })),
        ...rawTasks
          .filter((t) => t.title.toLowerCase().includes(q) || t.type.toLowerCase().includes(q))
          .map((t) => ({ type: "task", label: t.title, sub: t.type, path: "/tasks" })),
      ]
    : [];

  const now = new Date();
  const notifications = rawTasks
    .filter((t) => !t.completed && new Date(t.deadline) > now)
    .filter((t) => (new Date(t.deadline) - now) / 86400000 <= 7)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  if (!userData) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="dashboard">
      <Sidebar active="Dashboard" />

      <main className="main">
        <header className="topbar">
          <div className="searchWrapper" ref={searchRef}>
            <div className="searchInputRow">
              <span className="searchIcon">🔍</span>
              <input
                className="searchInput"
                type="text"
                placeholder="Search courses, tasks..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
              />
            </div>
            {showSearch && q && (
              <div className="searchDropdown">
                {searchResults.length === 0 ? (
                  <div className="searchEmpty">No results for "{searchQuery}"</div>
                ) : (
                  searchResults.map((r, i) => (
                    <div
                      className="searchItem"
                      key={i}
                      onClick={() => { navigate(r.path); setSearchQuery(""); setShowSearch(false); }}
                    >
                      <span className="searchItemIcon">{r.type === "course" ? "📚" : "☷"}</span>
                      <div>
                        <div className="searchItemLabel">{r.label}</div>
                        <div className="searchItemSub">{r.sub}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="profile">
            <div className="notifWrapper" ref={notifRef}>
              <button className="notifBtn" onClick={() => setShowNotifications((p) => !p)}>
                🔔
                {notifications.length > 0 && (
                  <span className="notifBadge">{notifications.length}</span>
                )}
              </button>
              {showNotifications && (
                <div className="notifDropdown">
                  <div className="notifHeader">Upcoming Deadlines</div>
                  {notifications.length === 0 ? (
                    <div className="notifEmpty">No upcoming deadlines</div>
                  ) : (
                    notifications.map((t) => (
                      <div className="notifItem" key={t._id}>
                        <span className={`notifDot ${t.type}`}></span>
                        <div>
                          <div className="notifTitle">{t.title}</div>
                          <div className="notifDate">
                            {new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="profileAvatar" style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#2da9e9,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 15 }}>
              {initials}
            </div>
            <b style={{ color: "#111" }}>{user.name || "User"}</b>
          </div>
        </header>

        <section className="content">
          <h1>Overview</h1>

          <div className="cards">
            <InfoCard icon="📚" title="Active Courses" text={String(userData.activeCourses)} />
            <InfoCard icon="☷" title="Pending Tasks" text={String(userData.pendingTasks)} />
            <InfoCard icon="📅" title="Upcoming Exam" text={userData.nextExam} />
            <InfoCard icon="🕒" title="Study Hours Today" text={`${userData.studyHoursToday}h`} />
          </div>

          <div className="middle">
            <div className="panel calendar">
              <div className="panelHeader">
                <h2>This Week</h2>
              </div>
              <div className="week">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div className="day" key={day}>{day}</div>
                ))}
                {userData.weekEvents.map((event, index) =>
                  event ? (
                    <Event key={index} text={event.text} color={event.color} />
                  ) : (
                    <div key={index} className="event empty" />
                  )
                )}
              </div>
            </div>

            <div className="panel plan">
              <h2>Smart Study Plan</h2>
              <p>Upcoming study sessions</p>
              {userData.studyPlan.length === 0 ? (
                <div className="emptyPanelState">
                  No study plan yet.{" "}
                  <span className="linkBtn" onClick={() => navigate("/study-plan")}>
                    Generate one →
                  </span>
                </div>
              ) : (
                userData.studyPlan.map((item, index) => (
                  <Timeline key={index} time={item.time} title={item.title} width={`${item.progress}%`} />
                ))
              )}
            </div>
          </div>

          <h2 className="sectionTitle">Course Progress</h2>

          {!userData.hasCourses ? (
            <div className="emptyCoursesState">
              No courses added yet.{" "}
              <span className="linkBtn" onClick={() => navigate("/courses")}>
                Add your first course →
              </span>
            </div>
          ) : (
            <div className="courseGrid">
              {userData.courses.map((course, index) => (
                <div className="courseCard" key={index}>
                  <div className="courseTop">
                    <div className="courseIcon">🎓</div>
                    <div>
                      <h3>{course.name}</h3>
                      <p>{course.sub}</p>
                    </div>
                  </div>
                  <div className="progressText">
                    <span>Chapter completed</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="bar">
                    <div style={{ width: `${course.progress}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {showChat && (
          <div className="chatPanel">
            <div className="chatPanelHeader">
              <span>💬 AI Study Assistant</span>
              <button onClick={() => setShowChat(false)}>✕</button>
            </div>
            <div className="chatMessages">
              {chatMessages.length === 0 && (
                <div className="chatWelcome">
                  Hi! I'm your AI study assistant. Ask me anything about your courses, tasks, or schedule.
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`chatMsg ${msg.role}`}>
                  {msg.content}
                </div>
              ))}
              {chatSending && <div className="chatMsg assistant typing">Thinking...</div>}
              <div ref={messagesEndRef} />
            </div>
            <div className="chatInputRow">
              <input
                type="text"
                placeholder="Ask your AI assistant..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={chatSending}
              />
              <button className="chatSendBtn" onClick={sendMessage} disabled={chatSending}>➤</button>
            </div>
          </div>
        )}
        <div className="chatBubble" onClick={() => {
          setShowChat((p) => !p);
          if (!chatLoaded) loadHistory();
        }}>
          💬
        </div>
      </main>
    </div>
  );
}

function InfoCard({ icon, title, text }) {
  return (
    <div className="infoCard">
      <div className="circle">{icon}</div>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function Event({ text, color }) {
  return <div className={`event ${color}`}>{text}</div>;
}

function Timeline({ time, title, width }) {
  return (
    <div className="timeline">
      <span className="time">{time}</span>
      <div className="dot"></div>
      <div className="session">
        <p>{title}</p>
        <div className="bar">
          <div style={{ width }}></div>
        </div>
      </div>
    </div>
  );
}
