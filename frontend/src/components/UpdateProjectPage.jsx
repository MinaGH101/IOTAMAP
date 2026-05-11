import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function UpdateProjectPage() {
  const { projectId } = useParams();
  const [name, setName] = useState("");
  const [shapefileZip, setShapefileZip] = useState(null);
  const [ranksExcel, setRanksExcel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch current project details to pre-fill the name
    fetch(`http://localhost:8000/api/v1/project?project_id=${projectId}`)
      .then(res => res.json())
      .then(data => setName(data.name))
      .catch(err => console.error("Error fetching project:", err));
  }, [projectId]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("در حال به‌روزرسانی...");

    try {
      // 1. Update Project Name
      const patchRes = await fetch("http://localhost:8000/api/v1/project", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, name: name })
      });

      if (!patchRes.ok) throw new Error("خطا در به‌روزرسانی نام");

      // 2. Upload Files if new ones are selected
      if (shapefileZip || ranksExcel) {
        setMessage("در حال بارگذاری فایل‌های جدید...");
        const formData = new FormData();
        if (shapefileZip) formData.append("shapefiles_zip", shapefileZip);
        if (ranksExcel) formData.append("ranks_excel", ranksExcel);
        formData.append("join_field", "Id");

        const uploadRes = await fetch(`http://localhost:8000/api/projects/${projectId}/gis/upload`, {
          method: "POST",
          body: formData
        });

        if (!uploadRes.ok) throw new Error("خطا در بارگذاری فایل‌ها");
      }

      setMessage("با موفقیت به‌روزرسانی شد. انتقال به نقشه...");
      setTimeout(() => navigate(`/map?project_id=${projectId}`), 1000);

    } catch (err) {
      setMessage(`خطا: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="entry-container">
      <div className="entry-card">
        <h1 className="entry-title-fa">ویرایش پروژه</h1>
        <p className="entry-subtitle">اطلاعات پروژه را تغییر داده یا فایل‌ها را جایگزین کنید</p>

        <form className="entry-form" onSubmit={handleUpdate}>
          <div className="map-field-group">
            <label className="entry-upload-label">نام پروژه</label>
            <input 
              type="text" 
              className="entry-input-text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required
              disabled={loading}
            />
          </div>

          <div className="entry-upload-box">
            <label className="entry-upload-label">جایگزینی زیپ .shapefile (اختیاری)</label>
            <div className="custom-file-upload">
              <input type="file" id="shape-file" accept=".zip" onChange={(e) => setShapefileZip(e.target.files[0])} disabled={loading} />
            </div>
          </div>

          <div className="entry-upload-box">
            <label className="entry-upload-label">جایگزینی اکسل ناهنجاری (اختیاری)</label>
            <div className="custom-file-upload">
              <input type="file" id="excel-file" accept=".xlsx, .xls" onChange={(e) => setRanksExcel(e.target.files[0])} disabled={loading} />
            </div>
          </div>

          {message && <div style={{ color: "var(--blue)", textAlign: "center" }}>{message}</div>}

          <button type="submit" className="entry-send-button" disabled={loading}>
            {loading ? "در حال پردازش..." : "ذخیره تغییرات و نمایش نقشه"}
          </button>
          
          <button type="button" className="map-btn map-btn-secondary" onClick={() => navigate("/projects")} disabled={loading}>
            انصراف
          </button>
        </form>
      </div>
    </div>
  );
}