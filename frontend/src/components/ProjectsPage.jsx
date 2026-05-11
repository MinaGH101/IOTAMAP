import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  // استفاده از ورژن v1 مطابق با آخرین کامیت بک‌اند
  const API_LIST = "http://localhost:8000/api/v1/projects";
  const API_ACTION = "http://localhost:8000/api/v1/project";

  const fetchProjects = async () => {
    try {
      const res = await fetch(API_LIST);
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("خطا در دریافت لیست:", err);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("حذف پروژه و تمام لایه‌های آن؟")) return;

    try {
      // ارسال آی‌دی در Body مطابق با ساختار API شما
      const res = await fetch(API_ACTION, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
      });
      
      if (res.ok) {
        setProjects(projects.filter(p => p.id !== id));
      } else {
        alert("خطا در حذف (احتمالاً به دلیل محدودیت‌های دیتابیس)");
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="entry-container">
      <div className="entry-card">
        <h1 className="entry-title">پروژه‌های من</h1>
        <p className="entry-subtitle">انتخاب پروژه برای مشاهده یا حذف</p>

        <div className="entry-form">
          {projects.map((project) => (
            <div key={project.id} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <button
                className="map-btn-secondary"
                style={{ flex: 1, textAlign: "right" }}
                onClick={() => navigate(`/map?project_id=${project.id}`)}
              >
                {project.name}
              </button>
              <button
                className="map-icon-button"
                onClick={(e) => handleDelete(project.id, e)}
                style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM8 4l1-1h6l1 1h4v2H4V4h4Z" />
                </svg>
              </button>
            </div>
          ))}

          <button className="entry-send-button" onClick={() => navigate("/projects/create")}>
            + ایجاد پروژه جدید
          </button>
        </div>
      </div>
    </div>
  );
}