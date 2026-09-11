import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Lock, User, Mail, Shield, ArrowRight, CheckCircle } from "lucide-react";
import { api } from "../services/api";

export const Login = ({ showToast, onLoginSuccess }) => {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
  });

  const syncOneSignalLogin = (user) => {
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async function (OneSignal) {
        try {
          if (OneSignal.login && user?.username) {
            await OneSignal.login(user.username);
          }
          const subId = OneSignal.User?.PushSubscription?.id;
          if (subId) {
            await api.subscribePush({
              userAgent: navigator.userAgent,
              subscribedAt: new Date().toISOString(),
              type: "browser_push",
              player_id: subId,
            });
          }
        } catch (e) {
          console.warn("OneSignal login sync:", e);
        }
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
        });
        showToast("Registration successful! Welcome.", "success");
        syncOneSignalLogin(res.user);
        onLoginSuccess(res.user);
        if (res.user.is_staff || res.user.is_superuser) {
          navigate("/admin");
        } else {
          navigate("/user");
        }
      } else {
        const res = await api.login(formData.username, formData.password);
        showToast("Logged in successfully! (LOGIN Trigger fired)", "success");
        syncOneSignalLogin(res.user);
        onLoginSuccess(res.user);
        if (res.user.is_staff || res.user.is_superuser) {
          navigate("/admin");
        } else {
          navigate("/user");
        }
      }
    } catch (err) {
      showToast(err.message || "Authentication failed. Check credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click Demo Fillers
  const fillAndLogin = async (username, password, role) => {
    setLoading(true);
    try {
      const res = await api.login(username, password);
      showToast(
        `Logged in as ${role}! LOGIN trigger fired automated notifications.`,
        "success"
      );
      syncOneSignalLogin(res.user);
      onLoginSuccess(res.user);
      if (res.user.is_staff || res.user.is_superuser) {
        navigate("/admin");
      } else {
        navigate("/user");
      }
    } catch (err) {
      showToast(`Login failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "85vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "32px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            className="brand-icon"
            style={{ width: "48px", height: "48px", margin: "0 auto 14px" }}
          >
            <Bell size={24} />
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: "700" }}>
            {isRegister ? "Create an Account" : "Notification System Portal"}
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginTop: "4px" }}>
            {isRegister
              ? "Sign up to receive automated multichannel notifications"
              : "Sign in to manage templates or test live triggers"}
          </p>
        </div>

        {/* Demo Fast-Login Buttons */}
        {!isRegister && (
          <div
            style={{
              background: "rgba(79, 70, 229, 0.08)",
              border: "1px solid rgba(79, 70, 229, 0.25)",
              borderRadius: "10px",
              padding: "14px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#818cf8",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Shield size={12} /> One-Click Demonstration Logins
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, borderColor: "rgba(99, 102, 241, 0.4)" }}
                onClick={() => fillAndLogin("admin", "admin123", "Admin")}
                disabled={loading}
              >
                <Shield size={13} color="#818cf8" />
                Demo Admin
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, borderColor: "rgba(16, 185, 129, 0.4)" }}
                onClick={() => fillAndLogin("ayush", "user123", "User (Ayush)")}
                disabled={loading}
              >
                <User size={13} color="#34d399" />
                Demo User
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ayush Sharma"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Username or Email</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. admin or user@example.com"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "12px", marginTop: "8px" }}
            disabled={loading}
          >
            {loading ? "Authenticating..." : isRegister ? "Create Account" : "Sign In"}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Toggle between Login and Register */}
        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "0.85rem" }}>
          {isRegister ? (
            <span style={{ color: "#9ca3af" }}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#38bdf8",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span style={{ color: "#9ca3af" }}>
              Need an account?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#38bdf8",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Register
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
