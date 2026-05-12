import React, { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

// 1. BLUEPRINT FOR THE API DATA
interface ProjectData {
  id: string;
  name: string;
}

const API_BASE = "http://localhost:8000";

export default function UpdateProjectPage() {
  // 2. TYPING THE URL PARAMETERS
  // This tells TS that "projectId" will definitely be a string
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  // 3. TYPING THE STATE
  const [name, setName] = useState<string>("");
  const [shapefileZip, setShapefileZip] = useState<File | null>(null);
  const [ranksExcel, setRanksExcel] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const storedId = localStorage.getItem('user_id');
    const storedName = localStorage.getItem('username');
    if (!storedId) {
      navigate('/login');
      return;
    }
    setUsername(storedName || "User");

    if (projectId) {
      fetch(`${API_BASE}/api/v1/project?project_id=${projectId}`)
        .then(res => res.json())
        .then((data: ProjectData) => setName(data.name))
        .catch(err => console.error("Error fetching project:", err));
    }
  }, [projectId, navigate]);

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("در حال به‌روزرسانی...");

    try {
      // Update Project Name
      const patchRes = await fetch(`${API_BASE}/api/v1/project`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, name: name })
      });

      if (!patchRes.ok) throw new Error("خطا در به‌روزرسانی نام");

      // Upload Files if selected
      if (shapefileZip || ranksExcel) {
        setMessage("در حال بارگذاری فایل‌های جدید...");
        const formData = new FormData();
        if (shapefileZip) formData.append("shapefiles_zip", shapefileZip);
        if (ranksExcel) formData.append("ranks_excel", ranksExcel);
        formData.append("join_field", "Id");

        const uploadRes = await fetch(`${API_BASE}/api/projects/${projectId}/gis/upload`, {
          method: "POST",
          body: formData
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.detail || "خطا در بارگذاری فایل‌ها");
        }
      }

      setMessage("با موفقیت به‌روزرسانی شد. انتقال به نقشه...");
      setTimeout(() => navigate(`/map?project_id=${projectId}`), 1000);

    } catch (err: any) {
      setError(err.message);
      setMessage("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="entry-container" dir="rtl">
      <div className="entry-card">
        <div className="entry-header">
          <h1 className="entry-title">IOTA VISION</h1>
          <p className="entry-subtitle">ویرایش اطلاعات و جایگزینی فایل‌های پروژه</p>
        </div>

        <form className="entry-form" onSubmit={handleUpdate}>
          
          <div className="map-field-group">
            <label className="entry-upload-label">نام پروژه</label>
            <input 
              type="text" 
              className="entry-input-text" 
              value={name} 
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} 
              required
              disabled={loading}
            />
          </div>

          <div className="map-field-group">
            <label className="entry-upload-label">جایگزینی زیپ .shapefile (اختیاری)</label>
            <div className="custom-file-upload">
              <label className="map-chip-button custom-file-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                انتخاب فایل
                <input
                  type="file"
                  hidden
                  accept=".zip"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setShapefileZip(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </label>
              <span className="custom-file-name">
                {shapefileZip ? shapefileZip.name : "فایلی انتخاب نشده"}
              </span>
            </div>
          </div>

          <div className="map-field-group">
            <label className="entry-upload-label">جایگزینی اکسل ناهنجاری (اختیاری)</label>
            <div className="custom-file-upload">
              <label className="map-chip-button custom-file-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                انتخاب فایل
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setRanksExcel(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </label>
              <span className="custom-file-name">
                {ranksExcel ? ranksExcel.name : "فایلی انتخاب نشده"}
              </span>
            </div>
          </div>

          {error && <div className="active-filter-box entry-message-error">{error}</div>}
          {message && <div className="active-filter-box">{message}</div>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
            <button type="submit" className="map-btn map-btn-primary" disabled={loading} style={{ flex: 2 }}>
              {loading ? "در حال پردازش ..." : "ذخیره و نمایش نقشه"}
            </button>
            <button type="button" className="map-btn" onClick={() => navigate(-1)} disabled={loading} style={{ flex: 1, backgroundColor: '#444', color: '#fff' }}>
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}