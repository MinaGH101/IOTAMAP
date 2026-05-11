import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  // Singular base for project actions, plural for the list [cite: 49, 367]
  const API_LIST_URL = "http://localhost:8000/api/v1/projects";
  const API_ACTION_URL = "http://localhost:8000/api/v1/project";

  const fetchProjects = async () => {
    try {
      // Matches GET api/v1/projects [cite: 367]
      const res = await fetch(API_LIST_URL);
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    
    if (!window.confirm("آیا از حذف این پروژه اطمینان دارید؟")) return;

    try {
      // DELETE api/v1/project (singular) with ID in the body [cite: 49, 368, 369]
      const res = await fetch(API_ACTION_URL, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: id }) 
      });
      
      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== id));
      } else {
        alert("خطا در حذف پروژه (۴۰۴ یا خطای سرور)");
      }
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  return (
    <div className="entry-container">
      <div className="entry-card">
        <h1 className="entry-title" style={{ color: "var(--blue)" }}>پروژه‌های من</h1>
        <p className="entry-subtitle">یک پروژه را برای مشاهده انتخاب کنید یا آن را حذف کنید</p>

        <div className="entry-form">
          {projects.length === 0 && (
            <div className="active-filter-box" style={{ textAlign: "center" }}>
              هیچ پروژه‌ای یافت نشد.
            </div>
          )}

          {projects.map((project) => (
            <div
              key={project.id}
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <button
                className="map-btn-secondary"
                style={{ flex: 1, textAlign: "right", padding: "12px 15px", height: "auto" }}
                onClick={() => navigate(`/map?project_id=${project.id}`)}
              >
                {project.name || `پروژه ${project.id}`}
              </button>

              <button
                className="map-icon-button"
                title="حذف پروژه"
                onClick={(e) => handleDelete(project.id, e)}
                style={{ 
                  background: "rgba(239, 68, 68, 0.1)", 
                  borderColor: "rgba(239, 68, 68, 0.2)", 
                  color: "#ef4444",
                  flex: "0 0 auto" 
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM8 4l1-1h6l1 1h4v2H4V4h4Z" />
                </svg>
              </button>
            </div>
          ))}

          <button
            className="entry-send-button"
            onClick={() => navigate("/projects/create")}
            style={{ marginTop: "20px" }}
          >
            + ایجاد پروژه جدید
          </button>
        </div>
      </div>
    </div>
  );
}