import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Layers,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  User,
  LogOut,
  Send,
} from "lucide-react";
import { api } from "../services/api";
import { AdminTable } from "../components/AdminTable";
import { TemplateModal } from "../components/TemplateModal";
import { NotificationLogs } from "../components/NotificationLogs";

export const AdminDashboard = ({ user, onLogout, showToast }) => {
  const [matrixData, setMatrixData] = useState({ triggers: [], providers: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [activeModal, setActiveModal] = useState({
    isOpen: false,
    template: null,
    trigger: null,
    channel: null,
  });
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [firingTrigger, setFiringTrigger] = useState(null);

  const fetchMatrix = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMatrix();
      setMatrixData(data);
    } catch (err) {
      showToast(err.message || "Failed to load notification matrix", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [refreshCounter]);

  const handleOpenModal = (template, trigger, channel) => {
    setActiveModal({
      isOpen: true,
      template,
      trigger,
      channel,
    });
  };

  const handleCloseModal = () => {
    setActiveModal({
      isOpen: false,
      template: null,
      trigger: null,
      channel: null,
    });
  };

  const handleManualFire = async (triggerKey) => {
    setFiringTrigger(triggerKey);
    try {
      const currentUser = api.getUser();
      const res = await api.fireTrigger(triggerKey, {
        user_name: currentUser?.first_name || currentUser?.username || "Admin",
        user_email: currentUser?.email || "ayush.kansal321@gmail.com",
      });
      showToast(
        `Trigger '${triggerKey.toUpperCase()}' dispatched across enabled channels!`,
        "success"
      );
      setRefreshCounter((prev) => prev + 1);
    } catch (err) {
      showToast(err.message || `Failed to fire trigger ${triggerKey}`, "error");
    } finally {
      setFiringTrigger(null);
    }
  };

  // Stats
  const totalTriggers = matrixData.triggers?.length || 0;
  let enabledChannelsCount = 0;
  matrixData.triggers?.forEach((trig) => {
    Object.values(trig.channels || {}).forEach((tpl) => {
      if (tpl?.is_enabled) enabledChannelsCount++;
    });
  });

  return (
    <div className="main-content">
      {/* Top Banner / Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "800", letterSpacing: "-0.03em" }}>
            Notification Matrix Center
          </h1>
          <p style={{ color: "#9ca3af", fontSize: "0.875rem", marginTop: "4px" }}>
            Manage multichannel notification templates and dispatch rules from a unified control table
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setRefreshCounter((c) => c + 1)}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            Refresh Matrix
          </button>

          <Link to="/user" className="btn btn-outline btn-sm">
            <User size={14} />
            User Portal
          </Link>
        </div>
      </div>

      {/* Provider Status Cards */}
      <div className="provider-banner">
        {/* WhatsApp */}
        <div className="provider-card">
          <div className="provider-info">
            <h4>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: matrixData.providers?.whatsapp?.configured ? "#10b981" : "#f59e0b",
                }}
              />
              {matrixData.providers?.whatsapp?.provider || "WhatsApp Gateway"}
            </h4>
            <p>{matrixData.providers?.whatsapp?.configured ? "Sandbox Active" : "Twilio / Meta Sandbox"}</p>
          </div>
          <div>
            <span
              className={`badge ${
                matrixData.providers?.whatsapp?.configured ? "badge-live" : "badge-mock"
              }`}
            >
              {matrixData.providers?.whatsapp?.configured ? "Live Connected" : "Sandbox / Mock"}
            </span>
          </div>
        </div>

        {/* Email */}
        <div className="provider-card">
          <div className="provider-info">
            <h4>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: matrixData.providers?.email?.configured ? "#10b981" : "#f59e0b",
                }}
              />
              Email (Resend)
            </h4>
            <p>Single Dedicated Provider</p>
          </div>
          <div>
            <span
              className={`badge ${
                matrixData.providers?.email?.configured ? "badge-live" : "badge-mock"
              }`}
            >
              {matrixData.providers?.email?.configured ? "Live Connected" : "Sandbox / Mock"}
            </span>
          </div>
        </div>

        {/* Web Push */}
        <div className="provider-card">
          <div className="provider-info">
            <h4>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: matrixData.providers?.webpush?.configured ? "#10b981" : "#f59e0b",
                }}
              />
              Web Push (OneSignal)
            </h4>
            <p>Browser Push Provider</p>
          </div>
          <div>
            <span
              className={`badge ${
                matrixData.providers?.webpush?.configured ? "badge-live" : "badge-mock"
              }`}
            >
              {matrixData.providers?.webpush?.configured ? "Live Connected" : "Sandbox / Mock"}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Management Matrix */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Layers size={20} color="#818cf8" />
              Channel Template Matrix
            </h2>
            <p className="card-subtitle">
              Click [Edit] to modify content, use toggle switches for instant ON/OFF routing, or [Test] to verify
            </p>
          </div>

          {/* Quick Manual Trigger Test Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Developer Trigger Test:</span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={firingTrigger === "login"}
              onClick={() => handleManualFire("login")}
              title="Manually fires the Login trigger with test payload"
            >
              <Zap size={13} color="#34d399" />
              {firingTrigger === "login" ? "Firing..." : "Fire 'Login'"}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={firingTrigger === "logout"}
              onClick={() => handleManualFire("logout")}
              title="Manually fires the Logout trigger with test payload"
            >
              <Zap size={13} color="#f87171" />
              {firingTrigger === "logout" ? "Firing..." : "Fire 'Logout'"}
            </button>
          </div>
        </div>

        {/* The Matrix Table */}
        <AdminTable
          triggers={matrixData.triggers}
          onRefresh={() => setRefreshCounter((c) => c + 1)}
          onEditTemplate={handleOpenModal}
          showToast={showToast}
        />
      </div>

      {/* Notification Logs */}
      <NotificationLogs refreshTrigger={refreshCounter} />

      {/* Edit Template Modal */}
      <TemplateModal
        isOpen={activeModal.isOpen}
        onClose={handleCloseModal}
        template={activeModal.template}
        triggerName={activeModal.trigger?.name || "Event"}
        channel={activeModal.channel}
        onSaveSuccess={() => setRefreshCounter((c) => c + 1)}
        showToast={showToast}
      />
    </div>
  );
};
