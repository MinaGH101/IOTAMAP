import { useState } from "react";

const PROJECT_ID = "test-project-1";
const API_BASE = "http://localhost:8000";

export default function UploadPage({ onOpenMap }) {
  const [shapefileZip, setShapefileZip] = useState(null);
  const [ranksExcel, setRanksExcel] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  async function handleUploadAndOpenGis(event) {
    event.preventDefault();

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
    setUploadMessage("در حال بارگزاری...");

    try {
      const formData = new FormData();

      // These field names must match the FastAPI endpoint exactly.
      formData.append("shapefiles_zip", shapefileZip);
      formData.append("ranks_excel", ranksExcel);

      const response = await fetch(`${API_BASE}/api/projects/${PROJECT_ID}/gis/upload`, {
        method: "POST",
        body: formData,
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (_) {
        payload = null;
      }

      if (!response.ok) {
        const detail = payload?.detail;
        const detailText = Array.isArray(detail)
          ? detail
              .map((item) => {
                const loc = Array.isArray(item.loc) ? item.loc.join(".") : item.loc;
                return `${loc || "field"}: ${item.msg || JSON.stringify(item)}`;
              })
              .join(" | ")
          : typeof detail === "object" && detail !== null
            ? JSON.stringify(detail)
            : detail;

        throw new Error(
          payload?.message ||
            detailText ||
            "بارگزاری انجام نشد، بک اند را چک کنید"
        );
      }

      setUploadMessage("بارگزاری انجام شد، درحال ارسال به نقشه...");
      onOpenMap?.();
    } catch (error) {
      setUploadError(error.message || "بارگزاری انجام نشد");
      setUploadMessage("");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="entry-page">
      <div className="entry-card">
        <div className="entry-eyebrow">IOTA VISION</div>
        <p className="entry-subtitle">
          بارگزاری قایل رقومی نقشه و جدول ناهنجاری
        </p>

        <form className="entry-upload-form" onSubmit={handleUploadAndOpenGis}>
          <label className="entry-upload-box">
            <span className="entry-upload-label">زیپ حاوی شیپ‌فایل</span>

            <div className="custom-file-upload">
              <label className="custom-file-button">
                انتخاب فایل
                <input
                  type="file"
                  hidden
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={(event) =>
                    setShapefileZip(event.target.files?.[0] || null)
                  }
                />
              </label>

              <span className="custom-file-name">
                {shapefileZip ? shapefileZip.name : "فایلی انتخاب نشده"}
              </span>
            </div>
          </label>

          <label className="entry-upload-box">
            <span className="entry-upload-label">جدول ناهنجاری عناصر</span>

            <div className="custom-file-upload">
              <label className="custom-file-button">
                انتخاب فایل
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(event) =>
                    setRanksExcel(event.target.files?.[0] || null)
                  }
                />
              </label>

              <span className="custom-file-name">
                {ranksExcel ? ranksExcel.name : "فایلی انتخاب نشده"}
              </span>
            </div>
          </label>

          {uploadError && <div className="entry-message entry-message-error">{uploadError}</div>}
          {uploadMessage && <div className="entry-message">{uploadMessage}</div>}

          <button type="submit" className="entry-send-button" disabled={uploading}>
            {uploading ? "در حال بارکزاری ..." : "ارسال به نقشه"}
          </button>
        </form>
      </div>
    </div>
  );
}
