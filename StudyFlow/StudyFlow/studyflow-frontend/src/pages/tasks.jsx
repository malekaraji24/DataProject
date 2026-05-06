import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import API from "../api/axios";
import "./shared.css";
import "./tasks.css";

const TYPE_COLORS = {
  exam: { bg: "#fee2e2", color: "#dc2626" },
  assignment: { bg: "#dbeafe", color: "#2563eb" },
  quiz: { bg: "#ede9fe", color: "#7c3aed" },
  project: { bg: "#dcfce7", color: "#16a34a" },
};

const TYPES = ["all", "exam", "assignment", "quiz", "project"];
const STATUSES = ["all", "pending", "completed"];

function formatDeadline(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [newTask, setNewTask] = useState({ title: "", type: "assignment", deadline: "", estimatedHours: 1, course: "" });
  const [saving, setSaving] = useState(false);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();

  useEffect(() => {
    Promise.all([API.get("/tasks"), API.get("/courses")])
      .then(([tasksRes, coursesRes]) => {
        setTasks(tasksRes.data || []);
        const loadedCourses = coursesRes.data || [];
        setCourses(loadedCourses);
        if (loadedCourses.length) {
          setNewTask((p) => ({ ...p, course: loadedCourses[0]._id }));
        }
      })
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.course) return setError("Please add a course before creating tasks.");
    setSaving(true);
    setError("");
    try {
      const res = await API.post("/tasks", { ...newTask, estimatedHours: Number(newTask.estimatedHours) });
      setTasks((prev) => [res.data, ...prev]);
      setShowAddForm(false);
      setNewTask((p) => ({ ...p, title: "", deadline: "", estimatedHours: 1 }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add task.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await API.put(`/tasks/${editingTask._id}`, {
        title: editingTask.title,
        type: editingTask.type,
        deadline: editingTask.deadline,
        estimatedHours: Number(editingTask.estimatedHours),
        course: editingTask.course?._id || editingTask.course,
      });
      setTasks((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)));
      setEditingTask(null);
    } catch {
      setError("Failed to update task.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      const res = await API.put(`/tasks/${task._id}`, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t._id === task._id ? res.data : t)));
    } catch {
      setError("Failed to update task.");
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await API.delete(`/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch {
      setError("Failed to delete task.");
    }
  };

  const openEdit = (task) => {
    setEditingTask({
      ...task,
      deadline: task.deadline ? task.deadline.slice(0, 10) : "",
      course: task.course?._id || task.course,
    });
  };

  const displayed = tasks
    .filter((t) => filterType === "all" || t.type === filterType)
    .filter((t) => {
      if (filterStatus === "pending") return !t.completed;
      if (filterStatus === "completed") return t.completed;
      return true;
    })
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="pageWrapper">
      <Sidebar active="Tasks" />
      <main className="pageMain">
        <header className="topbar">
          <div className="profile">
            <div className="profileAvatar">{initials}</div>
            <b>{user.name || "User"}</b>
          </div>
        </header>

        <div className="pageContent">
          <div className="pageHeader">
            <h1>Tasks</h1>
            <button className="btnPrimary" onClick={() => { setShowAddForm((p) => !p); setError(""); }}>
              {showAddForm ? "✕ Cancel" : "+ Add Task"}
            </button>
          </div>

          {error && <div className="errorMsg">{error}</div>}

          {showAddForm && (
            <div className="addTaskPanel">
              <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700 }}>New Task</h3>
              {courses.length === 0 && <div className="errorMsg">Please add a course before creating tasks.</div>}
              <form onSubmit={handleAddTask}>
                <div className="addTaskGrid">
                  <div className="formField" style={{ gridColumn: "1 / -1" }}>
                    <label>Title</label>
                    <input type="text" placeholder="e.g. Chapter 5 assignment" value={newTask.title}
                      onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="formField">
                    <label>Type</label>
                    <select value={newTask.type} onChange={(e) => setNewTask((p) => ({ ...p, type: e.target.value }))}>
                      <option value="assignment">Assignment</option>
                      <option value="exam">Exam</option>
                      <option value="quiz">Quiz</option>
                      <option value="project">Project</option>
                    </select>
                  </div>
                  <div className="formField">
                    <label>Course</label>
                    <select value={newTask.course} onChange={(e) => setNewTask((p) => ({ ...p, course: e.target.value }))} required>
                      {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="formField">
                    <label>Deadline</label>
                    <input type="date" value={newTask.deadline}
                      onChange={(e) => setNewTask((p) => ({ ...p, deadline: e.target.value }))} required />
                  </div>
                  <div className="formField">
                    <label>Estimated Hours</label>
                    <input type="number" min="0.5" max="100" step="0.5" value={newTask.estimatedHours}
                      onChange={(e) => setNewTask((p) => ({ ...p, estimatedHours: e.target.value }))} required />
                  </div>
                </div>
                <button type="submit" className="btnPrimary" disabled={saving || courses.length === 0} style={{ marginTop: 8 }}>
                  {saving ? "Adding..." : "Add Task"}
                </button>
              </form>
            </div>
          )}

          <div className="filtersRow">
            <div className="filterGroup">
              {TYPES.map((t) => (
                <button key={t} className={`filterPill ${filterType === t ? "active" : ""}`} onClick={() => setFilterType(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div className="filterGroup">
              {STATUSES.map((s) => (
                <button key={s} className={`filterPill ${filterStatus === s ? "active" : ""}`} onClick={() => setFilterStatus(s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loadingState">Loading tasks...</div>
          ) : displayed.length === 0 ? (
            <div className="emptyState">No tasks match your filters.</div>
          ) : (
            <div className="taskList">
              {displayed.map((task) => {
                const tc = TYPE_COLORS[task.type] || TYPE_COLORS.assignment;
                return (
                  <div className={`taskCard ${task.completed ? "completed" : ""}`} key={task._id}>
                    <div className="taskLeft">
                      <input type="checkbox" checked={task.completed} onChange={() => handleToggleComplete(task)} className="taskCheck" />
                      <div>
                        <div className={`taskTitle ${task.completed ? "done" : ""}`}>{task.title}</div>
                        <div className="taskMeta">
                          <span className="typeBadge" style={{ background: tc.bg, color: tc.color }}>{task.type}</span>
                          {task.course && <span className="courseBadge">{task.course.name || "Deleted course"}</span>}
                          <span className="deadlineText">📅 {formatDeadline(task.deadline)}</span>
                          <span className="hoursText">🕒 {task.estimatedHours}h</span>
                        </div>
                      </div>
                    </div>
                    <div className="taskActions">
                      <button className="taskActionBtn" onClick={() => openEdit(task)} title="Edit task">✏️</button>
                      <button className="taskActionBtn" onClick={() => handleDeleteTask(task._id)} title="Delete task">🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="modalOverlay" onClick={() => setEditingTask(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Task</h2>
            <form onSubmit={handleEditTask}>
              <div className="formField">
                <label>Title</label>
                <input type="text" value={editingTask.title}
                  onChange={(e) => setEditingTask((p) => ({ ...p, title: e.target.value }))} required />
              </div>
              <div className="formField">
                <label>Type</label>
                <select value={editingTask.type} onChange={(e) => setEditingTask((p) => ({ ...p, type: e.target.value }))}>
                  <option value="assignment">Assignment</option>
                  <option value="exam">Exam</option>
                  <option value="quiz">Quiz</option>
                  <option value="project">Project</option>
                </select>
              </div>
              <div className="formField">
                <label>Course</label>
                <select value={editingTask.course} onChange={(e) => setEditingTask((p) => ({ ...p, course: e.target.value }))}>
                  {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="formField">
                <label>Deadline</label>
                <input type="date" value={editingTask.deadline}
                  onChange={(e) => setEditingTask((p) => ({ ...p, deadline: e.target.value }))} required />
              </div>
              <div className="formField">
                <label>Estimated Hours</label>
                <input type="number" min="0.5" max="100" step="0.5" value={editingTask.estimatedHours}
                  onChange={(e) => setEditingTask((p) => ({ ...p, estimatedHours: e.target.value }))} required />
              </div>
              <div className="modalActions">
                <button type="button" className="btnSecondary" onClick={() => setEditingTask(null)}>Cancel</button>
                <button type="submit" className="btnPrimary" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
