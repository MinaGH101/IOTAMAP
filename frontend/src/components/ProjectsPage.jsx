import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  // دریافت ID کاربر فعلی برای فیلتر کردن پروژه‌ها
  const userId = localStorage.getItem("user_id");

  // آدرس‌های API بر اساس آخرین تغییرات بک‌اَند
  const API_LIST = "http://localhost:8000/api/v1/projects";
  const API_ACTION = "http://localhost:8000/api/v1/project";

  const fetchProjects = async () => {
    if (!userId) {
      navigate("/login");
      return;
    }

    try {
      // ارسال userId به بک‌اَند برای دریافت پروژه‌های اختصاصی کاربر
      const res = await fetch(`${API_LIST}?user_id=${userId}`);
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("خطا در دریافت لیست پروژه‌ها:", err);
    }
  };

  useEffect(() => { 
    fetchProjects(); 
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("آیا از حذف این پروژه و تمام لایه‌های آن اطمینان دارید؟")) return;

    try {
      // حذف پروژه با ارسال ID در Body
      const res = await fetch(API_ACTION, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
      });
      
      if (res.ok) {
        setProjects(projects.filter(p => p.id !== id));
      } else {
        alert("خطا در حذف پروژه. ممکن است محدودیت‌های دیتابیس مانع شده باشد.");
      }
    } catch (err) { 
      console.error("Delete error:", err); 
    }
  };

  return (
    <div className="entry-container" style={{ direction: "rtl" }}>
      <div className="entry-card">
        <h1 className="entry-title-fa">پروژه‌های من</h1>
        <p className="entry-subtitle">یک پروژه را برای مشاهده انتخاب کنید یا آن را مدیریت کنید</p>

        <div className="entry-form">
          {projects.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-soft)', padding: '20px' }}>
              شما هنوز پروژه‌ای ایجاد نکرده‌اید.
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} style={{ display: "flex", gap: "10px", marginBottom: "12px", alignItems: "center" }}>
                {/* دکمه اصلی برای ورود به نقشه */}
                <button
                  className="map-btn map-btn-secondary"
                  style={{ flex: 1, textAlign: "right", padding: "12px 15px" }}
                  onClick={() => navigate(`/map?project_id=${project.id}`)}
                >
                  {project.name || `پروژه بدون نام (${project.id})`}
                </button>
                
                {/* دکمه ویرایش (جدید) */}
                <button
                  className="map-icon-button"
                  title="ویرایش پروژه"
                  onClick={() => navigate(`/projects/update/${project.id}`)}
                  style={{ 
                    color: "var(--blue)", 
                    background: "rgba(74, 113, 252, 0.1)",
                    border: "1px solid rgba(74, 113, 252, 0.2)"
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M3 17.25V21h4.25L17.81 9.94l-4.25-4.25L3 17.25ZM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 4.25 4.25 1.83-1.83Z" />
                  </svg>
                </button>

                {/* دکمه حذف */}
                <button
                  className="map-icon-button"
                  title="حذف پروژه"
                  onClick={(e) => handleDelete(project.id, e)}
                  style={{ 
                    color: "#ef4444", 
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)"
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM8 4l1-1h6l1 1h4v2H4V4h4Z" />
                  </svg>
                </button>
              </div>
            ))
          )}

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