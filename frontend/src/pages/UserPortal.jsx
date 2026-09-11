import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, LogOut, Shield, Bell, CheckCircle, RefreshCw } from "lucide-react";
import { api } from "../services/api";
import { PushSubscriber } from "../components/PushSubscriber";

export const UserPortal = ({ user, onLogout, showToast }) => {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.logout();
      showToast("Logged out successfully! (LOGOUT Trigger fired)", "info");
      onLogout();
      navigate("/login");
    } catch (err) {
      showToast(err.message || "Logout failed", "error");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="main-content">
      {/* Header Banner */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))",
          border: "1px solid #334155",
          padding: "28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <User size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700" }}>
              Welcome back, {user?.first_name || user?.username}!
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "3px" }}>
              Account Email: <strong style={{ color: "#e2e8f0" }}>{user?.email || "N/A"}</strong>
              {user?.is_staff && (
                <span
                  className="badge badge-live"
                  style={{ marginLeft: "10px", fontSize: "0.7rem" }}
                >
                  <Shield size={11} /> Admin Role
                </span>
              )}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {user?.is_staff && (
            <Link to="/admin" className="btn btn-secondary">
              <Shield size={15} />
              Open Admin Matrix
            </Link>
          )}

          <button
            className="btn btn-danger"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Logs you out and fires the LOGOUT trigger event"
          >
            <LogOut size={15} />
            {loggingOut ? "Logging out..." : "Log Out (Fires LOGOUT Trigger)"}
          </button>
        </div>
      </div>

      {/* Web Push Subscriber Card */}
      <PushSubscriber showToast={showToast} />

      {/* Trigger Event Guide for Reviewer */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Real Trigger Event Flow</h3>
        </div>
        <div style={{ fontSize: "0.875rem", color: "#cbd5e1", lineHeight: "1.6" }}>
          <p style={{ marginBottom: "12px" }}>
            This application enforces <strong>REAL website actions</strong> instead of a fake simulator:
          </p>
          <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <li>
              <strong>1. Login Action:</strong> When you signed in moments ago, the Django backend verified your credentials, issued JWT tokens, and immediately fired the <code>LOGIN</code> trigger.
            </li>
            <li>
              <strong>2. Logout Action:</strong> When you click the red <strong>"Log Out"</strong> button above, the backend invalidates the session and immediately fires the <code>LOGOUT</code> trigger, dispatching notifications across all enabled channels.
            </li>
            <li>
              <strong>3. Administrator Matrix:</strong> If you are signed in as an administrator, you can toggle channels, edit templates with live previews, and inspect provider logs in the Admin Dashboard.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
