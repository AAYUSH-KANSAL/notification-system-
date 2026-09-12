import React, { useState } from "react";
import { MessageSquare, Mail, Bell, Edit, Send, Plus, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "../services/api";

export const AdminTable = ({ triggers, onRefresh, onEditTemplate, showToast }) => {
  const [togglingId, setTogglingId] = useState(null);
  const [testingId, setTestingId] = useState(null);

  const handleToggle = async (template) => {
    if (!template) return;
    setTogglingId(template.id);
    try {
      const updated = await api.toggleTemplate(template.id);
      showToast(
        `${template.channel.toUpperCase()} channel is now ${
          updated.is_enabled ? "ENABLED" : "DISABLED"
        }`,
        "success"
      );
      onRefresh();
    } catch (err) {
      showToast(err.message || "Failed to toggle channel", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleTestSend = async (template) => {
    if (!template) return;
    setTestingId(template.id);
    try {
      const currentUser = api.getUser();
      const res = await api.testTemplate(template.id, {
        user_name: currentUser?.first_name || currentUser?.username || "Admin",
        user_email: currentUser?.email || "",
      });
      const mode = res.result?.details?.mode || res.result?.status;
      showToast(
        `Test dispatched (${mode === "Sandbox / Mock Delivery" ? "Sandbox / Mock" : "Live Sent"})`,
        "success"
      );
      onRefresh();
    } catch (err) {
      showToast(err.message || "Failed to send test notification", "error");
    } finally {
      setTestingId(null);
    }
  };

  const renderChannelCell = (trigger, channelKey) => {
    const template = trigger.channels[channelKey];

    if (!template) {
      return (
        <div className="cell-card disabled" style={{ textAlign: "center", padding: "16px 8px" }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => onEditTemplate(null, trigger, channelKey)}
          >
            <Plus size={14} />
            Create Template
          </button>
        </div>
      );
    }

    const isEnabled = template.is_enabled;

    return (
      <div className={`cell-card ${isEnabled ? "enabled" : "disabled"}`}>
        <div className="cell-header">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              className={`badge ${isEnabled ? "badge-live" : "badge-muted"}`}
              style={{ fontSize: "0.68rem" }}
            >
              {isEnabled ? "ACTIVE" : "DISABLED"}
            </span>

            {channelKey === "whatsapp" && (
              <span
                className="badge"
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  fontSize: "0.68rem",
                }}
              >
                {template.status || "APPROVED"}
              </span>
            )}
          </div>

          <label className="switch" title={isEnabled ? "Disable Channel" : "Enable Channel"}>
            <input
              type="checkbox"
              checked={isEnabled}
              disabled={togglingId === template.id}
              onChange={() => handleToggle(template)}
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Content Snippet */}
        <div className="cell-preview">
          {channelKey === "email" && template.subject && (
            <strong style={{ color: "#38bdf8", display: "block" }}>
              Subj: {template.subject}
            </strong>
          )}
          {channelKey === "webpush" && template.title && (
            <strong style={{ color: "#c084fc", display: "block" }}>
              Title: {template.title}
            </strong>
          )}
          <span>{template.body}</span>
        </div>

        {/* Action Buttons */}
        <div className="cell-actions">
          <button
            className="btn btn-secondary btn-sm"
            style={{ flex: 1 }}
            onClick={() => onEditTemplate(template, trigger, channelKey)}
          >
            <Edit size={13} />
            Edit
          </button>

          <button
            className="btn btn-outline btn-sm"
            style={{ flex: 1 }}
            disabled={testingId === template.id}
            onClick={() => handleTestSend(template)}
          >
            <Send size={13} />
            {testingId === template.id ? "Sending..." : "Test"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="matrix-container">
      <table className="matrix-table">
        <thead>
          <tr>
            <th style={{ width: "24%" }}>Trigger Event</th>
            <th style={{ width: "25%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#34d399" }}>
                <MessageSquare size={16} />
                WhatsApp (Twilio / Meta)
              </div>
            </th>
            <th style={{ width: "25%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8" }}>
                <Mail size={16} />
                Email (Resend)
              </div>
            </th>
            <th style={{ width: "26%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#c084fc" }}>
                <Bell size={16} />
                Web Push (OneSignal)
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {triggers.map((trigger) => (
            <tr key={trigger.id}>
              <td className="trigger-cell">
                <h3>{trigger.name}</h3>
                <p>{trigger.description || `Fires on ${trigger.key}`}</p>
                <div style={{ marginTop: "8px" }}>
                  <code
                    style={{
                      background: "#1e293b",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "0.72rem",
                      color: "#94a3b8",
                    }}
                  >
                    key: {trigger.key}
                  </code>
                </div>
              </td>
              <td className="channel-cell">{renderChannelCell(trigger, "whatsapp")}</td>
              <td className="channel-cell">{renderChannelCell(trigger, "email")}</td>
              <td className="channel-cell">{renderChannelCell(trigger, "webpush")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
