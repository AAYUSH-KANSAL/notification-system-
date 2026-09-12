import React, { useState, useEffect } from "react";
import { X, Send, RefreshCw, Eye, Sparkles } from "lucide-react";
import { api } from "../services/api";

export const TemplateModal = ({
  isOpen,
  onClose,
  template,
  triggerName,
  channel,
  onSaveSuccess,
  showToast,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    body: "",
    is_enabled: true,
    status: "approved",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        title: template.title || "",
        subject: template.subject || "",
        body: template.body || "",
        is_enabled: template.is_enabled ?? true,
        status: template.status || "approved",
      });
    } else {
      // Default boilerplate
      setFormData({
        title: channel === "webpush" ? `Notification: ${triggerName}` : "",
        subject: channel === "email" ? `Update: ${triggerName}` : "",
        body: `Hello {{user_name}}, your ${triggerName} action occurred successfully!`,
        is_enabled: true,
        status: "approved",
      });
    }
  }, [template, channel, triggerName]);

  const handleInsertVariable = (varName) => {
    setFormData((prev) => ({
      ...prev,
      body: prev.body + ` {{${varName}}}`,
    }));
  };

  // Preview helper
  const renderPreview = (text) => {
    if (!text) return "";
    const currentUser = api.getUser();
    return text
      .replace(/\{\{\s*user_name\s*\}\}/g, currentUser?.first_name || currentUser?.username || "Ayush Sharma")
      .replace(/\{\{\s*user_email\s*\}\}/g, currentUser?.email || "ayush.kansal321@gmail.com")
      .replace(/\{\{\s*timestamp\s*\}\}/g, new Date().toUTCString());
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (template?.id) {
        await api.updateTemplate(template.id, {
          ...formData,
          trigger: template.trigger,
          channel: template.channel,
        });
        showToast("Template updated successfully", "success");
      }
      onSaveSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || "Failed to save template", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!template?.id) {
      showToast("Please save the template first before testing", "info");
      return;
    }
    setIsTesting(true);
    try {
      const currentUser = api.getUser();
      const res = await api.testTemplate(template.id, {
        user_name: currentUser?.first_name || currentUser?.username || "Admin",
        user_email: currentUser?.email || "ayush.kansal321@gmail.com",
      });
      const mode = res.result?.details?.mode || res.result?.status;
      showToast(
        `Test dispatched (${mode === "Sandbox / Mock Delivery" ? "Sandbox / Mock" : "Live Sent"})`,
        "success"
      );
      onSaveSuccess(); // Refresh logs/matrix if needed
    } catch (err) {
      showToast(err.message || "Test send failed", "error");
    } finally {
      setIsTesting(false);
    }
  };

  const handleWhatsAppSync = async () => {
    if (!template?.id || channel !== "whatsapp") return;
    setIsSyncing(true);
    try {
      const res = await api.syncWhatsAppTemplate(template.id);
      setFormData((prev) => ({ ...prev, status: res.status }));
      showToast(`WhatsApp Status: ${res.status.toUpperCase()} (Meta Cloud Sandbox)`, "success");
      onSaveSuccess();
    } catch (err) {
      showToast("WhatsApp status sync failed", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const channelLabel =
    channel === "whatsapp"
      ? "WhatsApp"
      : channel === "email"
      ? "Email"
      : "Web Push";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "600" }}>
              Configure {channelLabel} Template
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
              Trigger: <strong style={{ color: "#e2e8f0" }}>{triggerName}</strong>
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Status & Sync Bar for WhatsApp */}
            {channel === "whatsapp" && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#a7f3d0", textTransform: "uppercase" }}>
                    WhatsApp Sandbox / Review Status
                  </div>
                  <div style={{ fontWeight: "600", color: "#34d399", fontSize: "0.95rem" }}>
                    {formData.status.toUpperCase()}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleWhatsAppSync}
                  disabled={isSyncing}
                >
                  <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                  Cycle Sandbox Status
                </button>
              </div>
            )}

            {/* Email Subject */}
            {channel === "email" && (
              <div className="form-group">
                <label className="form-label">Email Subject Line</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Login Alert for {{user_name}}"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  required
                />
              </div>
            )}

            {/* Web Push Title */}
            {channel === "webpush" && (
              <div className="form-group">
                <label className="form-label">Push Notification Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Welcome Back, {{user_name}}!"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
            )}

            {/* Body */}
            <div className="form-group">
              <label className="form-label">Template Body / Message</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Write your message with dynamic {{variable}} tags..."
                value={formData.body}
                onChange={(e) =>
                  setFormData({ ...formData, body: e.target.value })
                }
                required
              />
              <div className="variable-chips">
                <span style={{ fontSize: "0.75rem", color: "#9ca3af", alignSelf: "center" }}>
                  Insert variable:
                </span>
                <button
                  type="button"
                  className="chip"
                  onClick={() => handleInsertVariable("user_name")}
                >
                  + &#123;&#123;user_name&#125;&#125;
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => handleInsertVariable("user_email")}
                >
                  + &#123;&#123;user_email&#125;&#125;
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => handleInsertVariable("timestamp")}
                >
                  + &#123;&#123;timestamp&#125;&#125;
                </button>
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="preview-box">
              <div className="preview-title">
                <Eye size={12} style={{ display: "inline", marginRight: "4px" }} />
                Live Rendered Preview
              </div>
              {channel === "email" && formData.subject && (
                <div style={{ fontWeight: "600", marginBottom: "6px", color: "#38bdf8" }}>
                  Subject: {renderPreview(formData.subject)}
                </div>
              )}
              {channel === "webpush" && formData.title && (
                <div style={{ fontWeight: "600", marginBottom: "6px", color: "#c084fc" }}>
                  Title: {renderPreview(formData.title)}
                </div>
              )}
              <div className="preview-content">{renderPreview(formData.body)}</div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTestSend}
              disabled={isTesting || !template?.id}
            >
              <Send size={14} />
              {isTesting ? "Sending..." : "Test Send"}
            </button>

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
