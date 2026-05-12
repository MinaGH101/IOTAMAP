import React, { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

// 1. THE BLUEPRINT (Interface)
// This tells TypeScript exactly what your data looks like
interface ProjectResponse {
  id: string;
  name: string;
  team_id: string;
  owner_id: string;
}

const API_BASE = "http://localhost:8000";

export default function CreateProjectPage() {
  const navigate = useNavigate();

  // 2. TYPING THE STATE
  // We tell React what kind of data each variable holds
  const [projectName, setProjectName] = useState<string>("");
  const [shapefileZip, setShapefileZip] = useState<File | null>(null);
  const [ranksExcel, setRanksExcel] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const storedId = localStorage.getItem('user_id');
    const storedName = localStorage.getItem('username');
    if (!storedId) {
      navigate('/login');
    } else {
      setUserId(storedId);
      setUsername(storedName || "User");
    }
  }, [navigate]);

  // 3. TYPING THE EVENT HANDLER
  // FormEvent tells TS this function is triggered by a form submit
  async function handleUploadAndOpenGis(event: FormEvent) {
    event.preventDefault();

    if (!projectName) {
      setUploadError("لطفا نام پروژه را وارد کنید");
      return;
    }
    if (!shapefileZip) {
      setUploadError("لطفا ابتدا فایل را بارگزاری کنید");
      return;
    }
    if (!ranksExcel) {
      setUploadError("لطفا فایل اکسل را بارگزاری کنید");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadMessage("در حال ایجاد پروژه و بارگزاری فایل‌ها...");

    try {
      // Create Project
      const projectResponse = await fetch(`${API_BASE}/api/v1/project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          team_id: "1", 
          owner_id: userId
        }),
      });

      if (!projectResponse.ok) throw new Error("خطا در ایجاد پروژه");
      
      // Use the blueprint for the response
      const projectData: ProjectResponse = await projectResponse.json();
      const newProjectId = projectData.id; 

      const formData = new FormData();
      formData.append("shapefiles_zip", shapefileZip);
      formData.append("ranks_excel", ranksExcel);
      formData.append("join_field", "Id");

      const uploadResponse = await fetch(
        `${API_BASE}/api/projects/${newProjectId}/gis/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.detail || "خطا در بارگزاری فایل‌های GIS");
      }

      setUploadMessage("با موفقیت بارگزاری شد. در حال انتقال...");
      navigate(`/map?project_id=${newProjectId}`);

    } catch (error: any) {
      setUploadError(error.message);
      setUploading(false);
    }
  }

  return (
    <div className="entry-container" dir="rtl">
      <div className="entry-card">
        <div className="entry-header">
          <h1 className="entry-title">IOTA VISION</h1>
          <p className="entry-subtitle">ایجاد پروژه و بارگزاری فایل‌های نقشه</p>
        </div>

        <form className="entry-form" onSubmit={handleUploadAndOpenGis}>
          
          <div className="map-field-group">
            <label className="entry-upload-label">نام پروژه</label>
            <input
              type="text"
              className="entry-input-text"
              placeholder="مثلا: پهنه بندی منطقه قم..."
              value={projectName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setProjectName(e.target.value)}
            />
          </div>

          <div className="map-field-group">
            <label className="entry-upload-label">زیپ حاوی .shapefile</label>
            <div className="custom-file-upload">
              <label 
                className="map-chip-button custom-file-button" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                انتخاب فایل
                <input
                  type="file"
                  hidden
                  accept=".zip"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setShapefileZip(event.target.files?.[0] || null)
                  }
                />
              </label>
              <span className="custom-file-name">
                {shapefileZip ? shapefileZip.name : "فایلی انتخاب نشده"}
              </span>
            </div>
          </div>

          <div className="map-field-group">
            <label className="entry-upload-label">جدول ناهنجاری عناصر</label>
            <div className="custom-file-upload">
              <label 
                className="map-chip-button custom-file-button" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                انتخاب فایل
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setRanksExcel(event.target.files?.[0] || null)
                  }
                />
              </label>
              <span className="custom-file-name">
                {ranksExcel ? ranksExcel.name : "فایلی انتخاب نشده"}
              </span>
            </div>
          </div>

          {uploadError && (
            <div className="active-filter-box entry-message-error">
              {uploadError}
            </div>
          )}
          {uploadMessage && (
            <div className="active-filter-box">
              {uploadMessage}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
            <button
              type="submit"
              className="map-btn map-btn-primary"
              disabled={uploading}
              style={{ flex: 2 }}
            >
              {uploading ? "در حال پردازش ..." : "ارسال به نقشه"}
            </button>
            
            <button
              type="button"
              className="map-btn"
              onClick={() => navigate(-1)}
              disabled={uploading}
              style={{ flex: 1, backgroundColor: '#444', color: '#fff' }}
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}