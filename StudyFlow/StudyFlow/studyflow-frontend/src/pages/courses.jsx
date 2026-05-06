import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import API from "../api/axios";
import "./shared.css";
import "./courses.css";

const DIFFICULTY_COLOR = {
  easy: { bg: "#dcfce7", color: "#16a34a" },
  medium: { bg: "#dbeafe", color: "#2563eb" },
  hard: { bg: "#fee2e2", color: "#dc2626" },
};

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [addChapterInputs, setAddChapterInputs] = useState({});
  const [newCourse, setNewCourse] = useState({ name: "", instructor: "", difficulty: "easy" });
  const [saving, setSaving] = useState(false);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();

  useEffect(() => {
    API.get("/courses")
      .then((res) => setCourses(res.data || []))
      .catch(() => setError("Failed to load courses."))
      .finally(() => setLoading(false));
  }, []);

  const handleAddCourse = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await API.post("/courses", newCourse);
      setCourses((prev) => [res.data, ...prev]);
      setShowAddModal(false);
      setNewCourse({ name: "", instructor: "", difficulty: "easy" });
    } catch {
      setError("Failed to add course.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditCourse = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await API.put(`/courses/${editingCourse._id}`, {
        name: editingCourse.name,
        instructor: editingCourse.instructor,
        difficulty: editingCourse.difficulty,
      });
      setCourses((prev) => prev.map((c) => (c._id === res.data._id ? res.data : c)));
      setEditingCourse(null);
    } catch {
      setError("Failed to update course.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (id) => {
    try {
      await API.delete(`/courses/${id}`);
      setCourses((prev) => prev.filter((c) => c._id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {
      setError("Failed to delete course.");
    }
  };

  const handleAddChapter = async (courseId) => {
    const title = (addChapterInputs[courseId] || "").trim();
    if (!title) return;
    try {
      const res = await API.post(`/courses/${courseId}/chapters`, { title });
      setCourses((prev) => prev.map((c) => (c._id === courseId ? res.data : c)));
      setAddChapterInputs((prev) => ({ ...prev, [courseId]: "" }));
    } catch {
      setError("Failed to add chapter.");
    }
  };

  const handleToggleChapter = async (courseId, chapterId) => {
    try {
      const res = await API.patch(`/courses/${courseId}/chapters/${chapterId}`);
      setCourses((prev) => prev.map((c) => (c._id === courseId ? res.data : c)));
    } catch {
      setError("Failed to update chapter.");
    }
  };

  const handleDeleteChapter = async (courseId, chapterId) => {
    try {
      const res = await API.delete(`/courses/${courseId}/chapters/${chapterId}`);
      setCourses((prev) => prev.map((c) => (c._id === courseId ? res.data : c)));
    } catch {
      setError("Failed to delete chapter.");
    }
  };

  const getCompletion = (course) => {
    if (!course.chapters.length) return 0;
    return Math.round((course.chapters.filter((ch) => ch.completed).length / course.chapters.length) * 100);
  };

  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="pageWrapper">
      <Sidebar active="Courses" />
      <main className="pageMain">
        <header className="topbar">
          <div className="profile">
            <div className="profileAvatar">{initials}</div>
            <b>{user.name || "User"}</b>
          </div>
        </header>

        <div className="pageContent">
          <div className="pageHeader">
            <h1>My Courses</h1>
            <button className="btnPrimary" onClick={() => setShowAddModal(true)}>
              + Add Course
            </button>
          </div>

          {error && <div className="errorMsg">{error}</div>}

          {loading ? (
            <div className="loadingState">Loading courses...</div>
          ) : courses.length === 0 ? (
            <div className="emptyState">No courses yet. Add your first course to get started!</div>
          ) : (
            <div className="coursesGrid">
              {courses.map((course) => {
                const pct = getCompletion(course);
                const dc = DIFFICULTY_COLOR[course.difficulty] || DIFFICULTY_COLOR.easy;
                const isExpanded = expandedId === course._id;

                return (
                  <div className="courseCard" key={course._id}>
                    <div className="courseCardTop">
                      <div className="courseIconBox" style={{ background: dc.bg, color: dc.color }}>📖</div>
                      <div style={{ flex: 1 }}>
                        <div className="courseName">{course.name}</div>
                        <div className="courseInstructor">{course.instructor}</div>
                      </div>
                      <span className="diffBadge" style={{ background: dc.bg, color: dc.color }}>
                        {course.difficulty}
                      </span>
                      <button
                        className="cardActionBtn"
                        onClick={() => setEditingCourse({ ...course })}
                        title="Edit course"
                      >✏️</button>
                      <button
                        className="cardActionBtn"
                        onClick={() => handleDeleteCourse(course._id)}
                        title="Delete course"
                      >🗑</button>
                    </div>

                    <div className="progressText">
                      <span>Chapter progress</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="bar">
                      <div style={{ width: `${pct}%` }}></div>
                    </div>

                    <button
                      className="expandBtn"
                      onClick={() => setExpandedId(isExpanded ? null : course._id)}
                    >
                      {isExpanded ? "Hide Chapters ▲" : `Manage Chapters (${course.chapters.length}) ▼`}
                    </button>

                    {isExpanded && (
                      <div className="chapterList">
                        {course.chapters.length === 0 && (
                          <div style={{ color: "#9ca3af", fontSize: 14, padding: "8px 0" }}>No chapters yet.</div>
                        )}
                        {course.chapters.map((ch) => (
                          <div className="chapterItem" key={ch._id}>
                            <input
                              type="checkbox"
                              checked={ch.completed}
                              onChange={() => handleToggleChapter(course._id, ch._id)}
                            />
                            <span style={{ flex: 1, textDecoration: ch.completed ? "line-through" : "none", color: ch.completed ? "#9ca3af" : "#111" }}>
                              {ch.title}
                            </span>
                            <button className="chapterDeleteBtn" onClick={() => handleDeleteChapter(course._id, ch._id)}>✕</button>
                          </div>
                        ))}
                        <div className="addChapterRow">
                          <input
                            type="text"
                            placeholder="New chapter title..."
                            value={addChapterInputs[course._id] || ""}
                            onChange={(e) => setAddChapterInputs((prev) => ({ ...prev, [course._id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && handleAddChapter(course._id)}
                          />
                          <button className="btnPrimary" onClick={() => handleAddChapter(course._id)}>Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="modalOverlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Course</h2>
            <form onSubmit={handleAddCourse}>
              <div className="formField">
                <label>Course Name</label>
                <input type="text" placeholder="e.g. Signals & Systems" value={newCourse.name}
                  onChange={(e) => setNewCourse((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="formField">
                <label>Instructor</label>
                <input type="text" placeholder="e.g. Dr. Smith" value={newCourse.instructor}
                  onChange={(e) => setNewCourse((p) => ({ ...p, instructor: e.target.value }))} required />
              </div>
              <div className="formField">
                <label>Difficulty</label>
                <select value={newCourse.difficulty} onChange={(e) => setNewCourse((p) => ({ ...p, difficulty: e.target.value }))}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="modalActions">
                <button type="button" className="btnSecondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btnPrimary" disabled={saving}>{saving ? "Adding..." : "Add Course"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {editingCourse && (
        <div className="modalOverlay" onClick={() => setEditingCourse(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Course</h2>
            <form onSubmit={handleEditCourse}>
              <div className="formField">
                <label>Course Name</label>
                <input type="text" value={editingCourse.name}
                  onChange={(e) => setEditingCourse((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="formField">
                <label>Instructor</label>
                <input type="text" value={editingCourse.instructor}
                  onChange={(e) => setEditingCourse((p) => ({ ...p, instructor: e.target.value }))} required />
              </div>
              <div className="formField">
                <label>Difficulty</label>
                <select value={editingCourse.difficulty} onChange={(e) => setEditingCourse((p) => ({ ...p, difficulty: e.target.value }))}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="modalActions">
                <button type="button" className="btnSecondary" onClick={() => setEditingCourse(null)}>Cancel</button>
                <button type="submit" className="btnPrimary" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
