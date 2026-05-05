import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./dashboard.css";

export default function Dashboard() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const coursesRes = await API.get("/courses");
        const tasksRes = await API.get("/tasks");
        const studyPlansRes = await API.get("/studyPlans");

        const courses = coursesRes.data || [];
        const tasks = tasksRes.data || [];
        const studyPlans = studyPlansRes.data || [];

        setUserData({
          name: "StudyFlow",
          activeCourses: courses.length,
          pendingTasks: tasks.length,
          nextExam: "Coming soon",
          studyHoursToday: 2.5,

          courses: courses.length
            ? courses.map((course) => ({
                name: course.name || course.title || "Unnamed Course",
                sub: course.description || "Course",
                progress: course.progress || 50,
              }))
            : [
                { name: "Signals & Systems", sub: "Fourier / Energy", progress: 65 },
                { name: "C++", sub: "OOP / Classes", progress: 45 },
                { name: "Data Structures", sub: "Stacks / Queues", progress: 85 },
              ],

          studyPlan: studyPlans.length
            ? studyPlans.map((plan) => ({
                time: plan.time || "10:00 AM",
                title: plan.title || plan.topic || "Study session",
                progress: plan.progress || 50,
              }))
            : [
                { time: "10:00 AM", title: "Revise Fourier Series", progress: 70 },
                { time: "12:00 PM", title: "Solve C++ Practice", progress: 55 },
                { time: "3:00 PM", title: "Data Structures Quiz", progress: 80 },
              ],

          weekEvents: tasks.length
            ? tasks.slice(0, 7).map((task) => ({
                text: task.title || task.name || "Task",
                color: "blue",
              }))
            : [
                { text: "Signals", color: "green" },
                { text: "C++", color: "purple" },
                { text: "Study Day", color: "orange" },
                { text: "DS", color: "blue" },
                { text: "Exam", color: "red" },
                { text: "Project", color: "green" },
                { text: "Quiz", color: "red" },
              ],
        });
      } catch (error) {
        console.error("Dashboard fetch error:", error);

        setUserData({
          name: "StudyFlow",
          activeCourses: 3,
          pendingTasks: 7,
          nextExam: "Signals in 3 days",
          studyHoursToday: 2.5,

          courses: [
            { name: "Signals & Systems", sub: "Fourier / Energy", progress: 65 },
            { name: "C++", sub: "OOP / Classes", progress: 45 },
            { name: "Data Structures", sub: "Stacks / Queues", progress: 85 },
          ],

          studyPlan: [
            { time: "10:00 AM", title: "Revise Fourier Series", progress: 70 },
            { time: "12:00 PM", title: "Solve C++ Practice", progress: 55 },
            { time: "3:00 PM", title: "Data Structures Quiz", progress: 80 },
          ],

          weekEvents: [
            { text: "Signals", color: "green" },
            { text: "C++", color: "purple" },
            { text: "Study Day", color: "orange" },
            { text: "DS", color: "blue" },
            { text: "Exam", color: "red" },
            { text: "Project", color: "green" },
            { text: "Quiz", color: "red" },
          ],
        });
      }
    };

    fetchDashboardData();
  }, []);

  if (!userData) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div>
          <div className="logo">
            📚 <span>StudyFlow</span>
          </div>

          <nav>
            {["Dashboard", "Courses", "Tasks", "Calendar", "Study Plan", "Exams", "Settings"].map(
              (item, i) => (
                <div className={`navItem ${i === 0 ? "active" : ""}`} key={item}>
                  <span>{["⌂", "📖", "📋", "📅", "🗓️", "📝", "⚙️"][i]}</span>
                  {item}
                </div>
              )
            )}
          </nav>
        </div>

        <div className="logout">
          <img src="https://i.pravatar.cc/40" alt="user" />
          <span>Logout</span>
          <span>↪</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <input placeholder="🔍  Search..." />

          <div className="profile">
            <span>🔔</span>
            <img src="https://i.pravatar.cc/45" alt="profile" />
            <b>{userData.name}</b>
          </div>
        </header>

        <section className="content">
          <h1>Overview</h1>

          <div className="cards">
            <InfoCard icon="📚" title="Courses" text={`Active Courses: ${userData.activeCourses}`} />
            <InfoCard icon="☷" title="Tasks" text={`Pending: ${userData.pendingTasks}`} />
            <InfoCard icon="📅" title="Upcoming Exams" text={userData.nextExam} />
            <InfoCard icon="🕒" title="Study Hours" text={`Today: ${userData.studyHoursToday} hrs`} />
          </div>

          <div className="middle">
            <div className="panel calendar">
              <div className="panelHeader">
                <h2>Weekly Calendar</h2>
                <span>‹  ›</span>
              </div>

              <div className="week">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div className="day" key={day}>
                    {day}
                  </div>
                ))}

                {userData.weekEvents.map((event, index) => (
                  <Event key={index} text={event.text} color={event.color} />
                ))}
              </div>
            </div>

            <div className="panel plan">
              <h2>Smart Study Plan</h2>
              <p>Upcoming study sessions</p>

              {userData.studyPlan.map((item, index) => (
                <Timeline
                  key={index}
                  time={item.time}
                  title={item.title}
                  width={`${item.progress}%`}
                  red={index === 1}
                />
              ))}
            </div>
          </div>

          <h2 className="sectionTitle">Course Progress</h2>

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
        </section>

        <div className="chatBox">
          <span>×</span>
          Hi, AI study assistant
          <br />
          chat widget?
        </div>

        <div className="chatBubble">💬</div>
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

function Timeline({ time, title, width, red }) {
  return (
    <div className="timeline">
      <span className="time">{time}</span>
      <div className="dot"></div>

      <div className={`session ${red ? "redSession" : ""}`}>
        <p>{title}</p>
        <div className="bar">
          <div style={{ width }}></div>
        </div>
      </div>
    </div>
  );
}